import { EventEmitter } from 'events';
import routes from '../../routes';
import Spider from '../Spider';
import logger from '../logger';

const debug = logger.debug('Worker');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default class Worker extends EventEmitter {
  constructor(engine) {
    super();

    this.engine = engine;
    this.running = true;
    this.operation = null;
    this.route = null;

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
  async start() {
    while (this.running) {
      const operation = await this.engine.waitForNext();
      if (!this.running) continue;

      // if there are no new operations to process,
      // keep on quering for them each second.
      if (!operation) {
        debug('There are no pending operations. Retrying in 1s');
        this.emit('operation:noop');
        await sleep(1000);
        continue;
      }

      const routeName = operation.route;
      const provider = operation.provider;
      const query = operation.query;
      const route = routes[provider][routeName];

      debug(`Got operation: ${provider}->${routeName}. Query: ${query}`);

      const spider = new Spider();
      spider.verbose();
      spider.addEmitter(this);
      spider.addEmitter(this.engine);

      this.operation = operation;
      this.route = route;
      this.spider = spider;

      const res = await spider.scrape(operation, this.engine);

      debug(
        `Operation finished: ${res.route}. ` +
        `${res.stats.item} items created. ` +
        `${res.stats.updated} items updated. ` +
        `${res.stats.spawned} operations created.`
     );

      this.operation = null;
      this.route = null;
      this.spider = null;

      continue;
    }

    // todo: pull worker from queue if was in queue
    this.emit('worker:stopped', this);
  }

  async stop() {
    if (!this.running) return;

    this.running = false;

    debug('Stopping worker.');

    await new Promise((resolve) => {
      this.once('worker:stopped', () => {
        debug('Worker stopped.');
        resolve();
      });
    });
  }
}
