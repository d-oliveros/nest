import { toArray, each, pick, defaults, isObject, isFunction, identity, compact } from 'lodash';
import invariant from 'invariant';
import phantom from 'phantom';
import createError from 'http-errors';
import request from 'request-promise';
import phantomConfig from '../config/phantom';
import createEmitter, { emitterProto } from './emitter';
import logger from './logger';
import Item from './Item';
import Operation from './Operation';
import createPage from './page';

const debug = logger.debug('Spider');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const baseProto = {
  running: true,
  isVerbose: false,
  phantom: null,
  iteration: 0,

  // enables "verbose" mode
  verbose() {
    if (!this.isVerbose) {
      this.on('start', debug.bind(this, 'Starting operation.'));
      this.on('finish', debug.bind(this, 'Operation finished.'));
      this.on('scraped:raw', debug.bind(this, 'Got raw scraped data.'));
      this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
      this.isVerbose = true;
    }
  },

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
  },

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
  },

  async openStatic(url) {
    const html = await request(url);
    const page = createPage(url, html);
    return page;
  },

  // creates a phantomJS instance
  async createPhantom() {
    debug('Creating PhantomJS instance');

    return await new Promise((resolve) => {
      phantom.create(phantomConfig, (ph) => {
        this.phantom = ph;
        resolve(ph);
      });
    });
  },

  // stops its phantomJS instance
  stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  },

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
  },

  // includes javascript <script> tags in opened web page
  async includeJS(page) {
    debug('Including JS on page');

    return await new Promise((resolve) => {
      page.includeJs('https://code.jquery.com/jquery-2.1.4.min.js', (status) => {
        resolve(status);
      });
    });
  },

  /**
   * Control functions
   */

  // stops the spider, optionally clearing the listeners
  stop(removeListeners) {
    debug('Stopping Spider');

    this.emit('spider:stopped');

    if (removeListeners) {
      this.removeAllListeners();
    }

    this.stopPhantom();
    this.running = false;
  },


  /**
   * Scraper functions
   */

  async scrape(operation, { routes, plugins }, retryCount = 0) {
    invariant(isObject(operation), 'Operation is not valid');
    invariant(!operation.finished, 'Operation was already finished');

    const { state, route: routeName, provider } = operation;
    const route = routes[provider][routeName];

    debug(`Starting operation: ${operation.routeId}` +
      (operation.query ? ` ${operation.query}` : ''));

    // save the starting time of this operation
    if (operation.wasNew) {
      state.startedDate = Date.now();
    }

    // create the URL using the operation's parameters
    const url = route.urlTemplate(operation);

    this.emit('operation:start', operation, url);

    // opens the page
    let page;
    let status;

    try {
      page = await this.open(url, { dynamic: route.isDynamic });

      // manually check if the page has been blocked
      if (isFunction(route.checkStatus)) {
        status = page.apply(route.checkStatus);
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

    debug(`Got ${status}`);

    // if the operation has been stopped
    if (!this.running) {
      this.emit('operation:stopped', operation);
      return operation;
    }

    // run the route's error handler for 4xx routes
    if (status >= 400) {
      const errorHandler = isFunction(route.onError)
        ? route.onError
        : this.defaultErrorHandler;

      let newOperation = errorHandler.call(this, operation, retryCount);

      // If the error handler returned a promise, resolve the promise
      if (isObject(newOperation) && isFunction(newOperation.then)) {
        newOperation = await newOperation;
      }

      // if nothing was returned from the error handler, stop
      if (!newOperation) {
        this.running = false;
        this.emit('operation:stopped', operation);
        throw createError(status);
      }

      // if the error handler returned `true` or a truthy value,
      // restart the operation
      if (!isObject(newOperation)) {
        newOperation = operation;
      }

      return await this.scrape(operation, { routes, plugins }, retryCount++);
    }

    // scapes and sanitizes the page
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

    // save and update items
    const results = await Item.eachUpsert(scraped.items);

    // change state
    if (scraped.hasNextPage) {
      state.currentPage++;
    } else {
      state.finished = true;
      state.finishedDate = Date.now();
    }

    if (scraped.state) {
      state.data = Object.assign(state.data || {}, scraped.state);
    }

    state.lastLink = url;
    operation.stats.pages++;
    operation.stats.items += results.created;
    operation.stats.updated += results.updated;

    this.iteration++;
    this.emit('scraped:page', results, operation);
    this.stopPhantom();

    debug('Saving operation');
    await operation.save();

    // if the operation has been stopped
    if (!this.running) {
      this.emit('operation:stopped', operation);
    }

    // Operation finished
    if (state.finished) {
      this.emit('operation:finish', operation);
      this.running = false;
      return operation;
    }

    // Operation has next page
    debug(`Scraping next page`);
    this.emit('operation:next', operation);

    return await this.scrape(operation, { routes, plugins });
  },

  defaultErrorHandler(operation, retryCount) {
    if (retryCount < 3) {
      debug('Operation blocked. Retrying in 5s...\n' +
        `Will retry ${3 - retryCount} more times`);

      let resolved = false;
      return new Promise((resolve) => {
        function onSpiderStopped() {
          resolved = true;
          resolve();
        }

        this.once('spider:stopped', onSpiderStopped);

        sleep(5000).then(() => {
          if (!resolved) {
            resolved = true;
            this.removeListener('spider:stopped', onSpiderStopped);
            resolve();
          }
        });
      });
    }

    debug(`Operation blocked. Aborting.`);
    return false;
  },

  // sanitize the raw scraped data
  sanitizeScraped(scraped) {
    const sanitized = isObject(scraped) ? Object.assign({}, scraped) : {};

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

const spiderProto = Object.assign({}, emitterProto, baseProto);

export default function createSpider(spider) {
  spider = spider || Object.create(spiderProto);
  createEmitter(spider);
  return spider;
}
