import async from 'async';
import routes from '../../routes';
import Operation from '../Operation';
import Spider from '../Spider';
import logger from '../logger';
import queue from './queue';
import state from './state';

const debug = logger.debug('Worker');

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
    this.isRunning = this.isRunning.bind(this);
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
    const self = this;

    // Keep processing operations while this worker is alive
    async.whilst(self.isRunning, loadOperation, onStop);

    function loadOperation(callback) {
      queue.push(self.startNextOperation, (err, spider) => {
        if (err) throw err;
        if (!spider) return callback();

        spider.once('error', (spiderError) => {
          logger.error(spiderError);
          self.operation = null;
          callback();
        });

        spider.once('operation:finish', (operation) => {
          debug(
            `Operation finished: ${operation.route}. ` +
            `${operation.stats.item} items created. ` +
            `${operation.stats.updated} items updated. ` +
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
      // todo: pull worker from queue if was in queue
      self.emit('worker:stopped', self);
    }
  }

  stop(callback) {
    if (!this.running) return callback();

    this.running = false;

    debug('Stopping worker.');

    if (this.spider) {
      this.spider.emit('spider:stop');
    }

    this.once('worker:stopped', () => {
      debug('Worker stopped.');
      callback();
    });
  }

  // gets and starts the next operation, and returns a running spider
  startNextOperation(callback) {
    Operation.getNext(state)
      .then((operation) => {
        if (!this.running) {
          return callback();
        }

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

        const routeName = operation.route;
        const provider = operation.provider;
        const query = operation.query;
        const route = routes[provider][routeName];

        debug(`Got operation: ${provider}->${routeName}. Query: ${query}`);

        const spider = new Spider();
        spider.verbose();
        spider.addEmitter(this);
        spider.scrape(operation);

        this.operation = operation;
        this.route = route;
        this.spider = spider;

        callback(null, spider);
      })
      .catch(callback);
  }

  isRunning() {
    return this.running;
  }
}
