import async from 'async';
import Spider from '../spider';
import Operation from '../models/Operation';
import loaderQueue from './loader.queue';
import routes from '../../routes';
import state from './state';
import _log from '../logger';

let debug = _log.debug('Worker');

// Exports: Worker
//
export default class Worker extends Spider {
  constructor() {
    super();

    this.timeoutPromise = null;
    this.running = true;

    this.operation = null;
    this.route = null;

    // Bind the methods to itself
    this.isRunning          = this.isRunning.bind(this);
    this.startNextOperation = this.startNextOperation.bind(this);

    // Debugging listeners
    this.on('operation:start', (operation, url) => {
      debug(`Scraping: ${url}`);
    });

    this.on('operation:blocked', (operation, url) => {
      debug(`Request blocked on: ${url}`);
    });

    // Starts the worker as soon as it is created
    debug('Starting worker.');
    this.start();
  }

  // start this worker
  start() {
    let self = this;

    // Keep processing operations while this worker is alive
    async.whilst(self.isRunning, loadOperation, onStop);

    function loadOperation(callback) {
      loaderQueue.push(self.startNextOperation, (err, spider) => {
        if (err) throw err;
        if (!spider) return callback();

        spider.once('error', (err) => {
          console.error(err);
          self.operation = null;
          callback();
        });

        spider.once('operation:finish', (operation) => {
          debug(
            `Operation finished: ${operation.route}. `+
            `${operation.stats.item} items created. `+
            `${operation.stats.updated} items updated. `+
            `${operation.stats.spawned} operations created.`
         );

          self.operation = null;
          self.route = null;
          self.spider = null;

          callback();
        });
      });
    }

    function onStop() {
      self.emit('worker:stopped', self);
      // todo: pull worker from loaderQueue if was in queue
    }
  }

  stop(callback) {
    if (!this.running) return callback();

    this.running = false;

    debug('Stopping worker.');

    if (this.spider)
      this.spider.emit('spider:stop');

    this.once('worker:stopped', () => {
      debug('Worker stopped.');
      callback();
    });
  }

  // gets and starts the next operation, and returns a running spider
  startNextOperation(callback) {
    Operation.getNext(state, (err, operation) => {
      if (err || !this.running)
        return callback(err);

      // if there are no new operations to process,
      // keep on quering for them each second.
      if (!operation) {
        debug('There are no pending operations. Retrying in 1s');
        this.emit('operation:noop');
        this.timeoutPromise = setTimeout(() => {
          this.timeoutPromise = null;
          this.startNextOperation(callback);
        }, 1000);

        return;
      }

      let routeName = operation.route;
      let provider  = operation.provider;
      let query     = operation.query;
      let route     = routes[provider][routeName];

      debug(`Got operation: ${provider}->${routeName}. Query: ${query}`);

      let spider = new Spider();
      spider.verbose();
      spider.addEmitter(this);
      spider.scrape(operation);

      this.operation = operation;
      this.route = route;
      this.spider = spider;

      callback(null, spider);
    });
  }

  isRunning() {
    return this.running;
  }
}
