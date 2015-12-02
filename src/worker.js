import uuid from 'uuid';
import invariant from 'invariant';
import { isObject, isFunction, pick, find } from 'lodash';
import { createSpider, spiderProto } from './spider';
import { createEmitter, emitterProto } from './emitter';
import Action from './db/Action';
import Item from './db/Item';
import logger from './logger';

const debug = logger.debug('nest:worker');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Worker = {

  /**
   * Start this worker
   * @return {Promise}
   */
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

  /**
   * Runs an action
   * @param  {Object}  action  Action instance
   * @return {Promise}         Updated action
   */
  async startAction(action) {
    invariant(isObject(action), 'Action is not valid');

    const { state, routeId } = action;
    const routes = this.engine.modules.routes;
    const route = find(routes, { key: routeId });

    if (action.state.finished) {
      debug('Action was already finished');
      return action;
    }

    // save the starting time of this action
    if (action.wasNew) {
      state.startedDate = Date.now();
    }

    debug(`Starting action: ${action.routeId} ${action.query || ''}`);

    let scraped;

    if (isFunction(this.process)) {
      // if the worker provides a custom processor
      scraped = await this.process(action, route);
      scraped = spiderProto.sanitizeScraped(scraped);
    } else {
      // else, scrape this route using a spider
      const spider = createSpider();
      this.spider = spider;
      const url = route.getUrl(action);

      scraped = await spider.scrape(url, route);
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
   * @return {Promise}  Array with spawned actions.
   */
  async spawnActions(actions) {
    const routes = this.engine.modules.routes;

    if (actions.length === 0) {
      debug('No actions to spawn');
      return [];
    }

    debug('Spawning actions');

    const newActions = await Promise.all(actions.map((op) => {
      const { routeId, query } = op;
      const targetRoute = find(routes, { key: routeId });

      if (!targetRoute) {
        logger.warn(`[spawnActions]: Route ${routeId} does not exist`);
        return Promise.resolve();
      }

      // Create a new action
      return Action.findOrCreate(targetRoute, query);
    }));

    debug(`Actions spawned: ${newActions.length} actions`);

    return newActions;
  },

  /**
   * Stops this worker and its spider, if any
   * @return {Promise}  Promise to be resolved when this worker is stopped
   */
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

  /**
   * Creates a new spider, link the spider emitter with this worker's emitter
   * @return {[type]} [description]
   */
  assignSpider() {
    const spider = createSpider();
    this.spider = spider;
    return spider;
  },

  initialize: function defaultInitializer() {},
  getActionQuery: function defaultActionQueryFactory() {}
};

/**
 * Creates a new worker instance
 * @param  {[type]} engine  [description]
 * @param  {[type]} augment [description]
 * @return {[type]}         [description]
 */
const createWorker = function(engine, augment) {
  invariant(isObject(engine), 'Engine is not an object');

  // constructs a new worker
  const worker = Object.assign(Object.create(Worker), emitterProto, {
    id: uuid.v4(),
    engine: engine,
    running: false,
    action: null,
    route: null,
    meta: {}
  });

  const extendableProperties = [
    'key',
    'concurrency',
    'initialize',
    'getActionQuery'
  ];

  // Augments the instance with the provided properties
  if (isObject(augment)) {
    Object.assign(worker, pick(augment, extendableProperties));
  }

  createEmitter.call(worker);

  debug(`Worker ${worker.id} created`);

  return worker;
};

export { Worker as workerProto, createWorker };
