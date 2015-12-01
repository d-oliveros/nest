import { EventEmitter } from 'events';
import uuid from 'uuid';
import invariant from 'invariant';
import { isObject, pick } from 'lodash';
import createSpider from './spider';
import logger from './logger';

const debug = logger.debug('nest:worker');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const workerProto = {
  id: null,
  engine: null,
  running: false,
  action: null,
  route: null,

  // start this worker
  async start() {
    if (this.running) return;

    if (this.initialize) {
      try {
        await this.initialize();
      } catch (err) {
        logger.error(err);
        throw err;
      }
    }

    this.running = true;

    return await new Promise((resolve) => {
      const self = this;
      this.engine.on('action:assigned', onActionAssigned);
      this.startLoop();

      function onActionAssigned(action, worker) {
        if (worker === self) {
          debug(`Worker ${self.id} started`);
          self.engine.removeListener('action:assigned', onActionAssigned);
          resolve();
        }
      }
    });
  },

  /**
   * Starts the worker loop
   * @return {Promise}  Promise to be resolved when the worker loop ends
   */
  async startLoop() {
    invariant(this.running, 'Worker must be running to start the worker loop');

    do {
      const spider = this.assignSpider();
      let action;
      let res;

      // get the next action
      try {
        action = await this.engine.assignAction(this);
      } catch (err) {
        logger.error(err);
        this.stop();
        continue;
      }

      if (!action) {
        debug('There are no pending actions. Retrying in 1s');
        await sleep(1000); // keeps quering every second
        continue;
      }

      // run the action
      try {
        res = await spider.scrape(action, this.engine.modules, this.meta);
      } catch (err) {
        logger.error(err);
        continue;
      }

      debug(
        `Action finished: ${res.route}. ` +
        `${res.stats.item} items created. ` +
        `${res.stats.updated} items updated. ` +
        `${res.stats.spawned} actions created.`);

      // check if should reinitialize
      if (res.shouldReinitialize) {
        debug(`Worker reinitializing`);
        try {
          await this.initialize();
        } catch (err) {
          logger.error(err);
          this.stop();
          continue;
        }
      }

    } while (this.running);

    this.action = null;
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
  },

  initialize: function defaultInitializer() {},
  getActionQuery: function defaultActionQueryFactory() {}
};

const composedProto = Object.assign({}, EventEmitter.prototype, workerProto);

const allowedDefinitionProps = [
  'key',
  'concurrency',
  'initialize',
  'getActionQuery'
];

export default function createWorker(engine, definition) {
  invariant(isObject(engine), 'Engine is not an object');

  const worker = Object.assign(Object.create(composedProto), {
    id: uuid.v4(),
    engine: engine,
    meta: {}
  });

  if (isObject(definition)) {
    Object.assign(worker, pick(definition, allowedDefinitionProps));
  }

  // Debugging listeners
  worker.on('action:start', (action, url) => {
    debug(`Scraping: ${url}`);
  });

  worker.on('action:blocked', (action, url) => {
    debug(`Request blocked on: ${url}`);
  });

  debug(`Worker ${worker.id} created`);

  return worker;
}
