import { toArray, each, pull, pick, clone, defaults, identity, compact } from 'lodash';
import { EventEmitter } from 'events';
import promisify from 'promisify-node';
import invariant from 'invariant';
import phantom from 'phantom';
import request from 'request';
import Page from './Page';
import config from '../../config';
import logger from '../logger';

const debug = logger.debug('Spider');

// Exports: Spider
//
export default class Spider extends EventEmitter {
  constructor() {
    super();
    this.running = true;
    this.isVerbose = false;
    this.phantom = null;
    this.iterations = 0;
    this.emitters = [];
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

  // opens a URL, returns a loaded page ready to be scraped
  // if "dynamic" is false, it will use cheerio instead of PhantomJS to scrape
  async open(url, options = {}) {
    let html;

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
    const self = this;
    const phantom = this.phantom ? this.phantom : await this.createPhantom();

    const page = phantom.createPage();
    promisify(page);

    if (process.env.PHANTOM_LOG === 'true') {
      page.set('onConsoleMessage', (msg) => {
        console.log(`Phantom Console: ${msg}`); // eslint-disable-line
      });
    }

    const pageOpenStatus = await page.open(url);
    invariant(pageOpenStatus, `Could not open url: ${url}`);

    const jsInjectionStatus = await this.includeJS(page);
    invariant(jsInjectionStatus, `Could not include JS on url: ${url}`);

    self.emit('page:ready', page);

    const html = page.evaluate(() => $('html').html()); // eslint-disable-line

    return new Page(url, html);
  }

  async openStatic(url) {
    const response = await promisify(request)(url);
    const html = response.data;
    return new Page(url, html);
  }

  // creates a phantomJS instance
  async createPhantom() {
    debug('Creating PhantomJS instance');

    this.phantom = await promisify(phantom.create)(config.phantom);

    return this.phantom;
  }

  // stops its phantomJS instance
  stopPhantom() {
    if (this.phantom) {
      debug('Stopping PhantomJS');
      this.phantom.exit();
    }

    this.phantom = null;
  }

  // includes javascript <script> tags in opened web page
  async includeJS(page) {
    debug('Including JS on page');
    await page.includeJs('https://code.jquery.com/jquery-2.1.1.min.js');
  }

  // stops the spider, optionally clearing the listeners
  stop(removeListeners) {
    debug('Stopping Spider.');

    if (removeListeners) {
      this.removeAllListeners();
    }

    this.stopPhantom();
    this.running = false;
  }

  // adds an external EventEmitter
  addEmitter(emitter) {
    this.emitters.push(emitter);
  }

  // removes an EventEmitter
  removeEmitter(emitter) {
    pull(this.emitters, emitter);
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
    sanitized.operations = compact(sanitized.items.map((op) => {
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
}

// runs an operation
Spider.prototype.scrape = require('./scrape');
