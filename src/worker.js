import { EventEmitter } from 'events';
import uuid from 'uuid';
import invariant from 'invariant';
import { isObject, isFunction, pick, find } from 'lodash';
import createSpider, { spiderProto } from './spider';
import Action from './db/Action';
import Item from './db/Item';
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
      this.engine.once('action:assigned', (action, worker) => {
        if (worker === this) {
          debug(`Worker ${this.id} started`);
          resolve();
        }
      });

      this.startLoop();
    });
  },

  /**
   * Starts the worker loop
   * @return {Promise}  Promise to be resolved when the worker loop ends
   */
  async startLoop() {
    invariant(this.running, 'Worker must be running to start the worker loop');

    do {
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
        res = await this.startAction(action);
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

    this.emit('worker:stopped', this);
  },

  async startAction(action) {
    invariant(isObject(action), 'Action is not valid');

    const { state, routeId } = action;
    const routes = this.engine.routes;

    if (action.state.finished) {
      debug('Action was already finished');
      return action;
    }

    // save the starting time of this action
    if (action.wasNew) {
      state.startedDate = Date.now();
    }

    debug(`Starting action: ${action.routeId}` +
      (action.query ? ` ${action.query}` : ''));

    this.emit('action:start', action);

    const route = find(routes, { key: routeId });
    let scraped;

    if (isFunction(this.process)) {
      // if the worker provides a custom processor
      scraped = await this.process(action, route);
      scraped = spiderProto.sanitizeScraped(scraped);
    } else {
      // else, scrape this route using a spider
      const spider = this.assignSpider();
      scraped = await spider.scrape(route);
    }

    if (!this.running) {
      return action;
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

    return await this.startAction(action);
  },

  /**
   * Creates new scraping actions
   * @param  {Array}  actions  Actions to create
   * @return {Promise}
   */
  async spawnActions(actions) {
    const routes = this.engine.routes;

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
      return Action.findOrCreate(targetRoute, query);
    });

    const newActions = await Promise.all(promises);

    debug(`Actions spawned: ${newActions.length} actions`);

    return newActions;
  },

  async stop() {
    if (!this.running) return;

    this.running = false;

    if (this.spider) {
      this.spider.stop();
      this.spider = null;
    }

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
