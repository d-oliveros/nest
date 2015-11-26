import { toArray, each, pull, pick, clone, defaults, isObject, identity, compact, assign } from 'lodash';
import { EventEmitter } from 'events';
import invariant from 'invariant';
import phantom from 'phantom';
import request from 'request-promise';
import phantomConfig from '../config/phantom';
import logger from './logger';
import Item from './Item';
import Operation from './Operation';
import createPage from './page';

const debug = logger.debug('Spider');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default class Spider extends EventEmitter {
  constructor() {
    super();
    this.running = true;
    this.isVerbose = false;
    this.phantom = null;
    this.iteration = 0;
    this.emitters = [];
  }

  // enables "verbose" mode
  verbose() {
    if (!this.isVerbose) {
      this.on('start', debug.bind(this, 'Starting operation.'));
      this.on('finish', debug.bind(this, 'Operation finished.'));
      this.on('scraped:raw', debug.bind(this, 'Got raw scraped data.'));
      this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
      this.isVerbose = true;
    }
  }

  /**
   * Emitter functions
   */

  // adds an external EventEmitter
  addEmitter(emitter) {
    this.emitters.push(emitter);
  }

  // removes an EventEmitter
  removeEmitter(emitter) {
    pull(this.emitters, emitter);
  }

  // @override EventEmitter.prototype.emit
  emit() {
    const args = toArray(arguments);

    // emit the event through own emitter
    EventEmitter.prototype.emit.apply(this, args);

    // emit the event through all the attached emitters
    each(this.emitters, (emitter) => {

      if (emitter.emitters) {
        // go through this emitter's emitters, if any.
        Spider.prototype.emit.apply(emitter, args);
      } else {
        // or, emit the event through this emitter
        EventEmitter.prototype.emit.apply(emitter, args);
      }
    });
  }

  /**
   * Page functions
   */

  // opens a URL, returns a loaded page ready to be scraped
  // if "dynamic" is false, it will use cheerio instead of PhantomJS to scrape
  async open(url, options = {}) {
    let html;

    invariant(isObject(options), 'Options needs to be an object');

    this.url = url;

    if (options.dynamic || process.env.FORCE_DYNAMIC) {
      debug(`Opening URL ${url} with PhantomJS`);
      html = await this.openDynamic.call(this, url);
    } else {
      debug(`Opening URL ${url}`);
      html = await this.openStatic.call(this, url);
    }

    return html;
  }

  async openDynamic(url) {
    const phantomPage = await this.createPhantomPage();

    if (process.env.PHANTOM_LOG === 'true') {
      phantomPage.set('onConsoleMessage', (msg) => {
        console.log(`Phantom Console: ${msg}`); // eslint-disable-line
      });
    }

    const pageOpenStatus = await phantomPage.openAsync(url);
    invariant(pageOpenStatus === 'success', `Could not open url: ${url}`);

    const jsInjectionStatus = await this.includeJS(phantomPage);
    invariant(jsInjectionStatus, `Could not include JS on url: ${url}`);

    this.emit('page:ready', phantomPage);

    const html = await phantomPage.evaluateAsync(() => $('html').html()); // eslint-disable-line
    const page = createPage(url, html);

    return page;
  }

  async openStatic(url) {
    const html = await request(url);
    const page = createPage(url, html);
    return page;
  }

  // creates a phantomJS instance
  async createPhantom() {
    debug('Creating PhantomJS instance');

    return await new Promise((resolve) => {
      phantom.create(phantomConfig, (ph) => {
        this.phantom = ph;
        resolve(ph);
      });
    });
  }

  // stops its phantomJS instance
  stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  }

  // creates a PhantomJS Page instance
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
  }

  // includes javascript <script> tags in opened web page
  async includeJS(page) {
    debug('Including JS on page');

    return await new Promise((resolve) => {
      page.includeJs('https://code.jquery.com/jquery-2.1.4.min.js', (status) => {
        resolve(status);
      });
    });
  }

  /**
   * Control functions
   */

  // stops the spider, optionally clearing the listeners
  stop(removeListeners) {
    debug('Stopping Spider');

    if (removeListeners) {
      this.removeAllListeners();
    }

    this.stopPhantom();
    this.running = false;
  }

  // error handler
  error(error) {
    if (typeof error === 'string') {
      error = `Spider: ${error}`;
      error += ` (Iteration: ${this.iteration})`;
      error += this.url ? ` (URL: ${this.url})` : '';
      error = new Error(error);
    }

    this.stopPhantom();
    this.emit('error', error);
  }


  /**
   * Scraper functions
   */

  async scrape(operation, { routes, plugins }) {
    const { state, route: routeName, provider } = operation;
    const route = routes[provider][routeName];

    debug(`Starting operation: ${operation.routeId}` +
      (operation.query ? ` ${operation.query}` : ''));

    // save the starting time of this operation
    if (operation.wasNew) {
      operation.state.startedDate = Date.now();
    }

    // create the URL using the operation's parameters
    const url = route.urlTemplate(operation);

    this.emit('operation:start', operation, url);

    // check if this operation is actually finished
    if (state.finished) {
      this.emit('operation:finish', operation);
      return operation;
    }

    // opens the page
    let page;
    let status;

    try {
      page = await this.open(url, { dynamic: route.isDynamic });
      debug(`Page opened`);
      status = await page.apply(route.checkStatus);
    } catch (err) {
      if (isObject(err) && (err.statusCode === 401 || err.statusCode > 404)) {
        debug(`Got ${err.statusCode}`);
        status = 'blocked';
      } else {
        throw err;
      }
    }

    if (status !== 'blocked') {
      debug(`Page status is ok`);
    } else {
      // IP has been blocked
      debug('Operation blocked. Retrying in 5s...');
      this.emit('operation:blocked', operation, url);

      // if the operation has been stopped
      if (!this.running) {
        this.emit('operation:stopped', operation);
        return operation;
      }

      // Else, wait 5 seconds and try again
      await sleep(5000);
      return await this.scrape(operation, { routes, plugins });
    }

    // scapes the page
    let scraped = await page.apply(route.scraper);
    this.emit('scraped:raw', scraped, operation);

    scraped = this.sanitizeScraped(scraped);

    each(scraped.items, (item) => {
      item.provider = provider;
      item.route = routeName;
      item.routeWeight = route.priority;
    });

    debug(`Scraped ${scraped.items.length} items`);

    // apply route-specific middleware
    scraped = route.middleware(scraped) || scraped;

    // apply plugins
    for (const plugin of toArray(plugins)) {
      try {
        scraped = await plugin(scraped) || scraped;
      } catch (err) {
        logger.error(err);
      }
    }

    // spawn new scraping operations
    if (scraped.operations.length === 0) {
      debug('No operations to spawn');
    } else {
      debug('Spawning operations');
      const promises = scraped.operations.map((op) => {
        const { provider, route, query } = op;
        const targetRouteId = `${provider}:${route}`;
        const targetRoute = routes[provider][route];

        if (!targetRoute) {
          debug(
            `Warning: ${operation.routeId} ` +
            `wanted to scrape ${targetRouteId}, ` +
            `but that route does not exists`);
          return Promise.resolve();
        }

        // Create a new operation
        return Operation.findOrCreate(query, targetRoute);
      });

      const newOperations = await Promise.all(promises);

      debug(`Operations spawned: ${newOperations.length} operations.`);
      this.emit('operations:created', newOperations);

      operation.stats.spawned += newOperations.length;
    }

    // change state
    if (scraped.hasNextPage) {
      state.currentPage++;
    } else {
      state.finished = true;
      state.finishedDate = Date.now();
    }

    if (scraped.state) {
      state.data = assign(state.data || {}, scraped.state);
    }

    state.lastLink = url;

    const results = await Item.eachUpsert(scraped.items);

    this.iteration++;
    operation.stats.pages++;
    operation.stats.items += results.created;
    operation.stats.updated += results.updated;

    this.emit('scraped:page', results, operation);
    this.stopPhantom();

    debug('Saving operation');
    await operation.save();

    // if the operation has been stopped
    if (!this.running) {
      this.emit('operation:stopped', operation);
    }

    // Operation finished
    if (!this.running || state.finished) {
      this.emit('operation:finish', operation);
      return operation;
    }

    // Operation has next page
    this.emit('operation:next', operation);
    debug(`Scraping next page`);
    return await this.scrape(operation, { routes, plugins });
  }

  // sanitize the raw scraped data
  sanitizeScraped(scraped) {
    const sanitized = clone(scraped ? scraped : {});

    debug('Sanitizing scraped');

    // set up defaults
    defaults(sanitized, {
      hasNextPage: false,
      items: [],
      operations: []
    });

    // validate scraped.items and scraped.operations type
    ['items', 'operations'].forEach((field) => {
      invariant(sanitized[field] instanceof Array,
        `Scraping function returned data.${field}, ` +
        `but its not an array.`);
    });

    // sanitize the operations
    sanitized.operations = compact(sanitized.operations.map((op) => {
      if (!op.provider || !op.route) return null;
      return op;
    }));

    // sanitize the items
    sanitized.items = sanitized.items.map((item) => {

      // remove empty properties
      item = pick(item, identity);

      each(item, (value, key) => {
        if (typeof value === 'string') {
          item[key] = item[key]
            // .replace(/^\s+|\s+$/g, '') // remove newlines from string edges
            .trim();
        }
      });

      return item;
    });

    return sanitized;
  }
}
