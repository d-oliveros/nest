import assert from 'assert';
import puppeteer from 'puppeteer';
import createError from 'http-errors';
import request from 'request-promise';
import {
  pickBy,
  identity,
  defaults,
  isBoolean,
  isString,
  isObject,
  isFunction,
} from 'lodash';

import puppeteerConfig from '../config/puppeteer';
import createPage from './page';
import logger from './logger';


const debug = logger.debug('nest:spider');
const { FORCE_DYNAMIC } = process.env;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRY_COUNT = 3;

/**
 * Creates or initializes a spider instance.
 *
 * @param  {Object}  spider  Base spider instance.
 * @return {Object}          Instanciated spider instance.
 */
export const createSpider = function () {
  return Object.assign(Object.create(spiderProto), {
    running: true,
    browser: undefined,
  });
};

export const spiderProto = {

  /**
   * Requests a url with request or Puppeteer, if 'dynamic' is true.
   *
   * @param  {String}  url      The URL to open.
   * @param  {Object}  options  Optional parameters.
   * @return {Object}           A Page instance.
   */
  async open(url, options = {}) {
    assert(isObject(options), 'Options needs to be an object');

    this.url = url;

    const page = await (options.dynamic || FORCE_DYNAMIC
      ? this.openDynamic(url)
      : this.openStatic(url)
    );

    return page;
  },

  /**
   * Requests a url with request.
   *
   * @param  {String}  url  The URL to request.
   * @return {Object}       A Page instance.
   */
  async openStatic(url) {
    debug(`Opening URL ${url}`);

    const response = await request(url, {
      resolveWithFullResponse: true,
    });

    const { statusCode, body } = response;
    const page = createPage({
      url,
      content: body,
      statusCode: statusCode,
      pageLoadRes: response,
    });

    return page;
  },

  /**
   * Requests a url with Puppeteer.
   *
   * @param  {String}  url  The URL to request.
   * @return {Object}       A Page instance.
   */
  async openDynamic(url) {
    debug(`Opening URL ${url} with Puppeteer`);

    const browser = this.browser || await this.createBrowser();
    const browserPage = await browser.newPage();

    const browserPageLoadRes = await browserPage.goto(url, { waitUtil: 'load' });

    const jqueryUrl = 'https://code.jquery.com/jquery-2.1.4.min.js';
    await browserPage.addScriptTag(jqueryUrl);

    const page = createPage({
      url,
      content: await browserPage.content(),
      statusCode: browserPageLoadRes.statusCode,
      browserPage: browserPage,
      pageLoadRes: browserPageLoadRes,
    });

    return page;
  },

  /**
   * Creates a Puppeteer instance.
   *
   * @return {Object}  Puppeteer instance.
   */
  async createBrowser() {
    debug('Creating Puppeteer instance');
    this.browser = await puppeteer.launch(puppeteerConfig);
    return this.browser;
  },

  /**
   * Stops own Puppeteer instance.
   *
   * @return {undefined}
   */
  stopBrowser() {
    if (this.browser) {
      debug('Stopping Puppeteer');
      this.browser.close();
    }

    this.browser = undefined;
  },

  /**
   * Injects javascript <script> tags in opened web page.
   *
   * @param  {Object}   page           Page instance to inject the JS.
   * @return {undefined}
   */
  async injectJS(page) {
    debug('Injecting JS on page');
    const jqueryUrl = 'https://code.jquery.com/jquery-2.1.4.min.js';
    await page.addScriptTag(jqueryUrl);
  },

  /**
   * Stops the spider, optionally clearing the listeners.
   *
   * @param  {Boolean}  removeListeners  Should its event listeners be removed?
   * @return {undefined}
   */
  stop(removeListeners) {
    debug('Stopping Spider');

    this.running = false;
    this.stopBrowser();

    if (removeListeners) {
      this.removeAllListeners();
    }
  },

  /**
   * Scrapes a web page using a route handler definition.
   *
   * @param  {String}  url    URL to scrape.
   * @param  {Object}  route  Route definition, holding the scraper func.
   * @param  {Object}  meta   Meta information.
   * @return {Object}         Scraped data.
   */
  async scrape(url, route, meta = {}) {
    assert(isString(url), 'Url is not a string');
    assert(isObject(route), 'Route is not an object');
    assert(isFunction(route.scraper), 'Route scraper is not a function');
    assert(isObject(meta), 'Meta is invalid');

    let page;
    let status;

    // open the page
    try {
      page = await this.open(url, { dynamic: route.dynamic });

      // manually check if the page has been blocked
      if (isFunction(route.checkStatus)) {
        status = await page.runInContext(route.checkStatus);
      }

      status = !isNaN(status)
        ? parseInt(status, 10)
        : page.status || 200;

    }
    catch (err) {
      if (isObject(err) && !isNaN(err.statusCode)) {
        status = parseInt(err.statusCode, 10);
      }
      else {
        throw err;
      }
    }

    if (!this.running) {
      return null;
    }

    debug(`Got status ${status}`);

    // run the route's error handler for 4xx routes
    if (status >= 400) {

      let nextStep = 'stop';

      meta.errorCount = meta.errorCount || 0;
      meta.errorCount += 1;

      try {
        if (isFunction(route.onError)) {
          nextStep = await route.onError.call(this, route, meta);
        }

        if (!isFunction(route.onError) || (isBoolean(nextStep) && nextStep)) {
          const retryCount = route.retryCount || MAX_RETRY_COUNT;
          nextStep = meta.errorCount <= retryCount ? 'retry' : 'stop';
        }
      }
      catch (err) {
        logger.error(err);
      }

      assert(isString(nextStep), 'Next step is not a string');

      this.stopBrowser();

      switch (nextStep) {
        case 'stop': {
          const err = createError(status);
          this.running = false;
          debug(`Request blocked with status code: ${status} (${err.message})`);
          throw createError(status);
        }

        case 'retry': {
          debug(`Retrying url ${url} (Retry count ${meta.errorCount})`);
          await sleep(3500);
          const scraped = await this.scrape(url, route, meta);
          return scraped;
        }

        default: {
          const newUrl = nextStep;
          debug(`Jumping to ${newUrl} with`, route, meta);
          const scraped = await this.scrape(newUrl, route, meta);
          return scraped;
        }
      }
    }

    // scapes the page
    let scraped = await page.runInContext(route.scraper);

    scraped = this.sanitizeScraped(scraped);
    scraped.page = page;

    for (const item of scraped.items) {
      if (route.key) {
        item.routeId = route.key;
      }
      if (route.priority) {
        item.routeWeight = route.priority;
      }
    }

    debug(`Scraped ${scraped.items.length} items`);

    this.stopBrowser();

    return scraped;
  },

  /**
   * Normalizes and sanitizes scraped data.
   *
   * @param  {Object}  scraped  The scraped data.
   * @return {Object}           Sanitized data.
   */
  sanitizeScraped(scraped) {
    const sanitized = isObject(scraped) ? Object.assign({}, scraped) : {};

    debug('Sanitizing scraped');

    // set up defaults
    defaults(sanitized, {
      hasNextPage: false,
      items: [],
      jobs: [],
    });

    // validate scraped.items and scraped.jobs type
    for (const field of ['items', 'jobs']) {
      assert(
        sanitized[field] instanceof Array,
        `Scraping function returned data.${field}, but its not an array.`
      );
    }

    // sanitize the jobs
    sanitized.jobs = sanitized.jobs.reduce((memo, op) => {
      if (op.routeId) {
        memo.push(op);
      }
      return memo;
    }, []);

    // sanitize the items
    sanitized.items = sanitized.items.map((item) => {

      // remove empty properties
      item = pickBy(item, identity);

      for (const key of Object.keys(item)) {
        if (typeof item[key] === 'string') {
          item[key] = item[key].trim();
        }
      }

      return item;
    });

    return sanitized;
  },
};
