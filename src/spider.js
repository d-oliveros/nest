import { pick, defaults, isObject, isFunction, identity, compact } from 'lodash';
import inspect from 'util-inspect';
import invariant from 'invariant';
import phantom from 'phantom';
import createError from 'http-errors';
import request from 'request-promise';
import phantomConfig from '../config/phantom';
import { createPage } from './page';
import logger from './logger';

const debug = logger.debug('nest:spider');
const { PHANTOM_LOG, FORCE_DYNAMIC } = process.env;
const MAX_RETRY_COUNT = 3;

const Spider = {

  /**
   * Requests a url with request or PhantomJS, if 'dynamic' is true
   * @param  {String}  url      The URL to open
   * @param  {Object}  options  Optional parameters
   * @return {Object}           A Page instance
   */
  async open(url, options = {}) {
    invariant(isObject(options), 'Options needs to be an object');

    this.url = url;

    const isDynamic = options.dynamic || FORCE_DYNAMIC;
    const getPage = isDynamic ? this.openDynamic : this.openStatic;

    return await getPage.call(this, url);
  },

  /**
   * Requests a url with request
   * @param  {String}  url  The URL to request
   * @return {Object}       A Page instance
   */
  async openStatic(url) {
    debug(`Opening URL ${url}`);

    const res = await request(url, {
      resolveWithFullResponse: true
    });

    const { statusCode, body } = res;
    const html = body;
    const page = createPage(html, { url, statusCode, res });

    return page;
  },

  /**
   * Requests a url with PhantomJS
   * @param  {String}  url  The URL to request
   * @return {Object}       A Page instance
   */
  async openDynamic(url) {
    debug(`Opening URL ${url} with PhantomJS`);

    const phantomPage = await this.createPhantomPage();

    if (PHANTOM_LOG === 'true') {
      phantomPage.set('onConsoleMessage', (msg) => {
        console.log(`Phantom Console: ${msg}`); // eslint-disable-line
      });
    }

    const pageOpenStatus = await phantomPage.openAsync(url);
    invariant(pageOpenStatus === 'success', `Could not open url: ${url}`);

    const jsInjectionStatus = await this.injectJS(phantomPage);
    invariant(jsInjectionStatus, `Could not inject JS on url: ${url}`);

    const getHTML = () => $('html').html(); // eslint-disable-line no-undef
    const html = await phantomPage.evaluateAsync(getHTML);
    const page = createPage(html, { url, phantomPage });

    return page;
  },

  /**
   * Creates a PhantomJS instance
   * @return {Object}  PhantomJS instance
   */
  async createPhantom() {
    debug('Creating PhantomJS instance');

    return await new Promise((resolve) => {
      phantom.create(phantomConfig, (ph) => {
        this.phantom = ph;
        resolve(ph);
      });
    });
  },

  /**
   * Stops own phantomjs instance
   * @return {undefined}
   */
  stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  },

  /**
   * Creates a PhantomJS Page instance
   * @return {Object}  PhantomJS page instance
   */
  async createPhantomPage() {
    const ph = this.phantom || await this.createPhantom();

    return await new Promise((resolve) => {
      ph.createPage((page) => {

        page.openAsync = (url) => {
          return new Promise((resolve) => {
            page.open(url, (status) => {
              resolve(status);
            });
          });
        };

        page.evaluateAsync = (func) => {
          return new Promise((resolve) => {
            page.evaluate(func, (res) => {
              resolve(res);
            });
          });
        };

        resolve(page);
      });
    });
  },

  /**
   * Injects javascript <script> tags in opened web page
   * @param  {Object}  page  Page instance to inject the JS
   * @return {[type]}      [description]
   */
  async injectJS(page) {
    debug('Injecting JS on page');

    return await new Promise((resolve) => {
      const jqueryUrl = 'https://code.jquery.com/jquery-2.1.4.min.js';
      page.includeJs(jqueryUrl, (status) => {
        resolve(status);
      });
    });
  },

  /**
   * Stops the spider, optionally clearing the listeners
   * @param  {Boolean}  removeListeners  Should its event listeners be removed?
   * @return {undefined}
   */
  stop(removeListeners) {
    debug('Stopping Spider');

    this.running = false;
    this.stopPhantom();

    if (removeListeners) {
      this.removeAllListeners();
    }
  },

  /**
   * Scrapes a web page using a route handler definition
   * @param  {String}  url  URL to scrape
   * @param  {Object}  route   Route definition, holding the scraper func
   * @param  {Object}  meta    Meta information
   * @return {Object}          Scraped data.
   */
  async scrape(url, route, meta = {}) {
    invariant(isObject(route), `Route not found`);

    let page;
    let status;

    // open the page
    try {
      page = await this.open(url, { dynamic: route.dynamic });

      // manually check if the page has been blocked
      if (isFunction(route.checkStatus)) {
        status = page.runInContext(route.checkStatus);
      }

      status = !isNaN(status)
        ? parseInt(status, 10)
        : page.status || 200;

    } catch (err) {
      if (isObject(err) && !isNaN(err.statusCode)) {
        status = parseInt(err.statusCode, 10);
      } else {
        throw err;
      }
    }

    if (!this.running) {
      return null;
    }

    debug(`Got ${status}`);

    // run the route's error handler for 4xx routes
    if (status >= 400) {

      let nextStep = 'stop';

      meta.errorCount = meta.errorCount || 0;
      meta.errorCount++;

      try {
        if (isFunction(route.onError)) {
          nextStep = await route.onError.call(this, route, meta);
        } else {
          const retryCount = route.retryCount || MAX_RETRY_COUNT;
          nextStep = meta.errorCount <= retryCount ? 'retry' : 'stop';
        }
      } catch (err) {
        logger.error(err);
      }

      switch (nextStep) {
        case 'stop':
          this.running = false;
          debug(`Stopping with error`);
          throw createError(status);

        case 'retry':
          debug(`Retrying url ${url} (Retry count ${meta.errorCount})`);
          return await this.scrape(url, route, meta);

        default:
          const newUrl = nextStep;
          debug(`Jumping to ${newUrl} with ${inspect(route)}, ${inspect(meta)}`);
          return await this.scrape(newUrl, route, meta);
      }
    }

    // scapes the page
    let scraped = await page.runInContext(route.scraper);

    scraped = this.sanitizeScraped(scraped);

    for (const item of scraped.items) {
      if (route.key) {
        item.routeId = route.key;
      }
      if (route.priority) {
        item.routeWeight = route.priority;
      }
    }

    debug(`Scraped ${scraped.items.length} items`);

    return scraped;
  },

  /**
   * Normalizes and sanitizes scraped data
   * @param  {Object}  scraped  The scraped data
   * @return {Object}           Sanitized data
   */
  sanitizeScraped(scraped) {
    const sanitized = isObject(scraped) ? Object.assign({}, scraped) : {};

    debug('Sanitizing scraped');

    // set up defaults
    defaults(sanitized, {
      hasNextPage: false,
      items: [],
      actions: []
    });

    // validate scraped.items and scraped.actions type
    for (const field of ['items', 'actions']) {
      invariant(sanitized[field] instanceof Array,
        `Scraping function returned data.${field}, ` +
        `but its not an array.`);
    }

    // sanitize the actions
    sanitized.actions = compact(sanitized.actions.map((op) => {
      if (!op.routeId) return null;
      return op;
    }));

    // sanitize the items
    sanitized.items = sanitized.items.map((item) => {

      // remove empty properties
      item = pick(item, identity);

      for (const key in item) {
        if (item.hasOwnProperty(key) && typeof item[key] === 'string') {
          item[key] = item[key].trim();
        }
      }

      return item;
    });

    return sanitized;
  }
};

/**
 * Creates or initializes a spider instance
 * @param  {Object}  spider  Base spider instance
 * @return {Object}          Instanciated spider instance
 */
const createSpider = function(spider) {
  return Object.assign(spider || Object.create(Spider), {
    running: true,
    phantom: null
  });
};

export { Spider as spiderProto, createSpider };
