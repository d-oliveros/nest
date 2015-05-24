import {toArray, each, pull, pick, clone, defaults, identity} from 'lodash';
import {EventEmitter} from 'events';
import phantom        from 'phantom';
import request        from 'request';
import async          from 'async';
import Page           from './Page';
import config         from '../../config';
import _log           from '../logger';

let debug = _log.debug('Spider');

// Exports: Spider
//
export default class Spider extends EventEmitter {
  constructor() {
    super();
    this.running    = true;
    this.verbose    = false;
    this.phantom    = null;
    this.iterations = 0;
    this.emitters   = [];
  }

  // @override EventEmitter.prototype.emit
  emit() {
    let args = toArray(arguments);

    // emit the event through own emitter
    EventEmitter.prototype.emit.apply(this, args);

    // emit the event through all the attached emitters
    each(this.emitters, (emitter) => {

      // go through this emitter's emitters, if any.
      if (emitter.emitters)
        Spider.prototype.emit.apply(emitter, args);

      // or, emit the event through this emitter
      else
        EventEmitter.prototype.emit.apply(emitter, args);
    });
  }

  // enables "verbose" mode
  verbose() {
    if (!this.verbose) {
      this.on('start',        debug.bind(this, 'Starting operation.'));
      this.on('finish',       debug.bind(this, 'Operation finished.'));
      this.on('scraped:raw',  debug.bind(this, 'Got raw scraped data.'));
      this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
      this.verbose = true;
    }
  }

  // opens a URL, returns a loaded page ready to be scraped
  // if "useStatic" is true, it will use cheerio instead of PhantomJS to scrape
  open(url, dynamic, callback) {
    if (typeof dynamic === 'function') {
      callback = dynamic;
      dynamic = false;
    }

    this.url = url;

    if (dynamic || process.env.FORCE_DYNAMIC) {
      debug(`Opening URL ${url} with PhantomJS`);
      this.openDynamic.call(this, url, callback);
    }

    else {
      debug(`Opening URL ${url}`);
      this.openStatic.call(this, url, callback);
    }
  }

  openDynamic(url, callback) {
    let self = this;

    async.waterfall([
      function getPhantom(cb) {
        if (self.phantom) return cb(null, self.phantom);
        self.createPhantom(cb);
      },
      function createPhantomTab(phantom, cb) {
        phantom.createPage((page) => cb(null, page));
      },
      function enableConsole(page, cb) {
        if (process.env.PHANTOM_LOG === 'true') {
          page.set('onConsoleMessage', (msg) => {
            console.log(`Phantom Console: ${msg}`);
          });
        }
        cb(null, page);
      },
      function openURL(page, cb) {
        page.open(url, (status) => {
          if (!status) return cb(`Could not open url: ${url}`);
          cb(null, page);
        });
      },
      function includeJS(page, cb) {
        self.includeJS(page, (status) => {
          if (!status) return cb(`Could not include JS on url: ${url}`);
          self.emit('page:ready', page);
          cb(null, page);
        });
      },
      function LoadPage(page, cb) {
        page.evaluate(
          () => $('html').html(), //eslint-disable-line no-undef
          (html) => cb(null, new Page(url, html))
       );
      }
    ], callback);
  }

  openStatic(url, callback) {
    request(url, (error, response, html) => {
      if (error) return callback(error);
      callback(null, new Page(url, html));
    });
  }

  // creates a phantomJS instance
  createPhantom(callback) {
    debug('Creating PhantomJS instance');

    phantom.create(config.phantom, (ph) => {
      this.phantom = ph;
      callback(null, ph);
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

  // includes javascript <script> tags in opened web page
  includeJS(page, callback) {
    debug('Including JS on page');
    page.includeJs('https://code.jquery.com/jquery-2.1.1.min.js', callback);
  }

  // stops the spider, optionally clearing the listeners
  stop(removeListeners) {
    debug('Stopping Spider.');

    if (removeListeners)
      this.removeAllListeners();

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
    let sanitized = clone(scraped ? scraped : {});

    debug('Sanitizing scraped');

    // set up defaults
    defaults(sanitized, {
      hasNextPage: false,
      items: [],
      operations: []
    });

    // validate scraped.items and scraped.operations type
    ['items', 'operations'].forEach(function(field) {
      if (!(sanitized[field] instanceof Array))
        throw new Error(
          'Scraping function returned data.'+field+', '+
          'but its not an array.');
    });

    // sanitize the items
    sanitized.items = sanitized.items.map(function(item) {

      // remove empty properties
      item = pick(item, identity);

      each(item, function(value, key) {
        if (typeof value === 'string') {
          item[key] = item[key]
            //.replace(/^\s+|\s+$/g, '') // remove newlines from string edges
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
      error = 'Spider: '+error;
      error += ' (Iteration: '+this.iteration+')';
      error += this.url ? ' (URL: '+this.url+')' : '';
      error = new Error(error);
    }

    this.stopPhantom();
    this.emit('error', error);
  }
}

// runs an operation
Spider.prototype.scrape = require('./scrape');
