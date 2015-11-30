import { toArray, find, each, pick, defaults, isObject, isFunction, identity, compact, sortBy } from 'lodash';
import invariant from 'invariant';
import phantom from 'phantom';
import createError from 'http-errors';
import request from 'request-promise';
import phantomConfig from '../config/phantom';
import Item from './db/Item';
import Action from './db/Action';
import createEmitter, { emitterProto } from './emitter';
import logger from './logger';
import createPage from './page';

const debug = logger.debug('nest:spider');
const { PHANTOM_LOG, FORCE_DYNAMIC } = process.env;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const baseProto = {
  running: true,
  isVerbose: false,
  phantom: null,
  iteration: 0,

  // enables "verbose" mode
  verbose() {
    if (!this.isVerbose) {
      this.on('start', debug.bind(this, 'Starting action.'));
      this.on('finish', debug.bind(this, 'Action finished.'));
      this.on('scraped:raw', debug.bind(this, 'Got raw scraped data.'));
      this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
      this.isVerbose = true;
    }
  },

  /**
   * Page functions
   */

  // opens a URL, returns a loaded page
  // if "dynamic" is false, it will use cheerio instead of PhantomJS to scrape
  async open(url, options = {}) {
    invariant(isObject(options), 'Options needs to be an object');

    this.url = url;

    const isDynamic = options.dynamic || FORCE_DYNAMIC;
    const getPage = isDynamic ? this.openDynamic : this.openStatic;

    return await getPage.call(this, url);
  },

  async openStatic(url) {
    debug(`Opening URL ${url}`);

    const res = await request(url, {
      resolveWithFullResponse: true
    });

    const { statusCode, body } = res;
    const html = body;
    const page = createPage(html, { url, statusCode, res });

    this.emit('page:open', page);

    return page;
  },

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

    const jsInjectionStatus = await this.includeJS(phantomPage);
    invariant(jsInjectionStatus, `Could not include JS on url: ${url}`);

    const html = await phantomPage.evaluateAsync(() => $('html').html()); // eslint-disable-line
    const page = createPage(html, { url, phantomPage });

    this.emit('page:open', page, phantomPage);

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

  async scrape(action, { routes, plugins }, retryCount = 0) {
    invariant(isObject(action), 'Action is not valid');

    if (action.state.finished) {
      debug('Action was already finished');
      return action;
    }

    const { state, routeId } = action;
    const route = find(routes, { key: routeId });

    invariant(route.initialized, 'Route has not been initialized');

    debug(`Starting action: ${action.routeId}` +
      (action.query ? ` ${action.query}` : ''));

    // save the starting time of this action
    if (action.wasNew) {
      state.startedDate = Date.now();
    }

    // create the URL using the action's parameters
    const url = route.urlGenerator(action);

    this.emit('action:start', action, url);

    // opens the page
    let page;
    let status;

    try {
      page = await this.open(url, { dynamic: route.isDynamic });

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

    // if the action has been stopped
    if (!this.running) {
      this.emit('action:stopped', action);
      return action;
    }

    debug(`Got ${status}`);

    // run the route's error handler for 4xx routes
    if (status >= 400) {

      let newAction;

      try {
        newAction = await route.onError.call(this, action, retryCount);
      } catch (err) {
        newAction = null;
        logger.error(err);

        if (isObject(err) && !isNaN(err.statusCode)) {
          status = parseInt(err.statusCode, 10);
        }
      }

      // if nothing was returned from the error handler, stop
      if (!newAction) {
        this.running = false;
        this.emit('action:stopped', action);
        throw createError(status);
      }

      // if the error handler returned `true` or a truthy value,
      // restart the action
      if (!isObject(newAction)) {
        newAction = action;
      }

      return await this.scrape(action, { routes, plugins }, retryCount++);
    }

    // scapes and sanitizes the page
    let scraped = await page.runInContext(route.scraper);
    this.emit('scraped:raw', scraped, action, page);

    scraped = this.sanitizeScraped(scraped);

    each(scraped.items, (item) => {
      item.routeId = route.key;
      item.routeWeight = route.priority;
    });

    debug(`Scraped ${scraped.items.length} items`);

    // apply route-specific middleware
    if (isFunction(route.middleware)) {
      try {
        scraped = await route.middleware(scraped) || scraped;
      } catch (err) {
        logger.error(err);
      }
    }

    // apply plugins
    for (const plugin of sortBy(toArray(plugins), 'weight')) {
      try {
        scraped = await plugin(scraped) || scraped;
      } catch (err) {
        logger.error(err);
      }
    }

    const newOps = await this.spawnActions(scraped.actions, routes);

    if (newOps.length) {
      this.emit('actions:created', newOps);
      action.stats.spawned += newOps.length;
    }

    // save and update items
    const results = await Item.eachUpsert(scraped.items);
    results.actionsCreated = newOps.length;

    // change state
    if (scraped.hasNextPage) {
      state.currentPage++;
    } else {
      state.finished = true;
      state.finishedDate = Date.now();
    }

    state.history.push(url);

    if (scraped.state) {
      state.data = Object.assign(state.data || {}, scraped.state);
    }

    action.stats.pages++;
    action.stats.items += results.created;
    action.stats.updated += results.updated;
    action.updated = new Date();

    this.iteration++;
    this.emit('scraped:page', results, action);
    this.stopPhantom();

    debug('Saving action');
    await action.save();

    // if the action has been stopped
    if (!this.running) {
      this.emit('action:stopped', action);
    }

    // Action finished
    if (state.finished) {
      this.emit('action:finish', action);
      this.running = false;
      return action;
    }

    // Action has next page
    debug(`Scraping next page`);
    this.emit('action:next', action);

    return await this.scrape(action, { routes, plugins });
  },

  /**
   * Creates new scraping actions
   * @param  {Array}  actions  Actions to create
   * @param  {Object} routes   available routes
   * @return {Promise}
   */
  async spawnActions(actions, routes) {
    if (actions.length === 0) {
      debug('No actions to spawn');
      return [];
    }

    debug('Spawning actions');

    const promises = actions.map((op) => {
      const { routeId, query } = op;
      const targetRoute = find(routes, { key: routeId });

      if (!targetRoute) {
        logger.warn(`[spawnActions]: Route ${routeId} does not exist`);
        return Promise.resolve();
      }

      // Create a new action
      return Action.findOrCreate(query, targetRoute);
    });

    const newActions = await Promise.all(promises);

    debug(`Actions spawned: ${newActions.length} actions`);

    return newActions;
  },

  defaultErrorHandler(action, retryCount) {
    if (retryCount < 3) {
      debug('Action blocked. Retrying in 5s...\n' +
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

    debug(`Action blocked. Aborting.`);
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
      actions: []
    });

    // validate scraped.items and scraped.actions type
    ['items', 'actions'].forEach((field) => {
      invariant(sanitized[field] instanceof Array,
        `Scraping function returned data.${field}, ` +
        `but its not an array.`);
    });

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

const spiderProto = Object.assign({}, emitterProto, baseProto);

export default function createSpider(spider) {
  spider = spider || Object.create(spiderProto);
  createEmitter(spider);
  return spider;
}
