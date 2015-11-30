import { EventEmitter } from 'events';
import uuid from 'uuid';
import invariant from 'invariant';
import { isObject } from 'lodash';
import createSpider from './spider';
import logger from './logger';

const debug = logger.debug('nest:worker');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const workerProto = {
  id: null,
  engine: null,
  running: false,
  operation: null,
  route: null,

  // start this worker
  async start() {
    if (this.running) return;

    this.running = true;

    return await new Promise((resolve) => {
      const self = this;``
      this.engine.on('operation:assigned', onOperationAssigned);
      this.startLoop();

      function onOperationAssigned(operation, worker) {
        if (worker === self) {
          debug(`Worker ${self.id} started`);
          self.engine.removeListener('operation:assigned', onOperationAssigned);
          resolve();
        }
      }
    });
  },

  async startLoop() {
    invariant(this.running, 'Worker must be running to start the worker loop');

    do {
      try {
        const spider = this.assignSpider();
        const operation = await this.engine.assignOperation(this);

        if (!operation) {
          debug('There are no pending operations. Retrying in 1s');
          await sleep(1000); // keeps quering every second
          continue;
        }

        const res = await spider.scrape(operation, this.engine);

        debug(
          `Operation finished: ${res.route}. ` +
          `${res.stats.item} items created. ` +
          `${res.stats.updated} items updated. ` +
          `${res.stats.spawned} operations created.`);

      } catch (err) {
        logger.error(err);
      }
    } while (this.running);

    this.operation = null;
    this.route = null;
    this.spider = null;

    this.emit('worker:stopped', this);
  },

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
  },

  assignSpider() {
    const spider = createSpider();
    spider.verbose();
    spider.addEmitter(this);
    spider.addEmitter(this.engine);
    this.spider = spider;
    return spider;
  }
};

const composedProto = Object.assign({}, EventEmitter.prototype, workerProto);

export default function createWorker(engine) {
  invariant(isObject(engine), 'Engine is not an object');

  const worker = Object.assign(Object.create(composedProto), {
    id: uuid.v4(),
    engine: engine
  });

  // Debugging listeners
  worker.on('operation:start', (operation, url) => {
    debug(`Scraping: ${url}`);
  });

  worker.on('operation:blocked', (operation, url) => {
    debug(`Request blocked on: ${url}`);
  });

  debug(`Worker ${worker.id} created`);

  return worker;
}
