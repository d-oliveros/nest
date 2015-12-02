import createEmitter, { emitterProto } from './emitter';
import inspect from 'util-inspect';
import Queue from 'promise-queue';
import invariant from 'invariant';
import { find, isFunction, isObject, times, pluck } from 'lodash';
import engineConfig from '../config/engine';
import createWorker from './worker';
import logger from './logger';
import Action from './db/Action';

const debug = require('debug')('nest:engine');

const Engine = {

  /**
   * Spawns workers, assign actions to workers, and start each worker's loop.
   * @return {Promise}  Resolved when all the workers are assigned an action.
   */
  async start() {
    if (this.running) return;

    this.running = true;

    // Create default workers
    times(engineConfig.workers, () => this.assignWorker());

    // Create custom workers
    for (const workerDefinition of this.modules.workers) {
      const amount = workerDefinition.concurrency || engineConfig.workers;
      times(amount, () => this.assignWorker(workerDefinition));
    }

    debug(`Created ${this.workers.length} workers`);

    const workerStartPromises = this.workers.map((worker) => worker.start());
    await Promise.all(workerStartPromises);

    return;
  },

  /**
   * Stops the engine and its workers.
   * @return {Promise}  Resolved when all the workers are stopped.
   */
  async stop() {
    if (!this.running) return;

    this.running = false;
    this.workers = [];

    return await Promise.all(this.workers.map((worker) => worker.stop()));
  },

  /**
   * Creates a new worker, links the worker's emitter to the engine's emitter
   * @param {Object}  definition  Properties to augment the worker with
   * @return {Object}             The newly created worker
   */
  assignWorker(definition) {
    const worker = createWorker(this, definition);
    worker.addEmitter(this);
    this.workers.push(worker);
  },

  /**
   * Queries for a new action, and assigns the action to the worker
   * @param  {Object}  worker  Worker to assign the action to
   * @return {Object}          Fetched Action instance.
   */
  async assignAction(worker) {
    return await this.queue.add(async () => {
      debug(`Queue access`);

      const query = this.getBaseActionQuery();

      // get the worker's action query
      if (worker.key) {
        query.worker = worker.key;

        if (isFunction(worker.getActionQuery)) {
          try {
            const workerQuery = worker.getActionQuery() || {};

            invariant(isObject(workerQuery),
              `Invalid value returned from getActionQuery() (${worker.key})`);

            invariant(!isFunction(workerQuery.then),
              `Promises are not supported in worker's action query`);

            if (isObject(workerQuery)) {
              Object.assign(query, workerQuery);
            }
          } catch (err) {
            logger.error(err);
          }
        }
      }

      debug(`Getting next action.\nQuery: ${inspect(query)}`);

      const action = await Action
        .findOne(query)
        .sort({ 'priority': -1 })
        .exec();

      if (!action) {
        this.emit('action:noop');
      } else {
        const routeKey = action.routeId;
        const query = action.query;
        const route = find(this.modules.routes, { key: routeKey });

        debug(`Got action: ${routeKey}. Query: ${query}`);

        worker.action = action;
        worker.route = route;
      }

      this.emit('action:assigned', action, worker);

      return action;
    });
  },

  /**
   * Gets the base query to be used to fetch a new action from the database
   * @return {Object}  Query
   */
  getBaseActionQuery() {
    const runningActions = this.getRunningActionIds();
    const disabledRoutes = this.getDisabledRouteIds();
    const routeIds = pluck(this.modules.routes, 'key');

    // build the query used to get an action
    const query = {
      'state.finished': false,
      routeId: { $in: routeIds }
    };

    if (runningActions) {
      query._id = { $nin: runningActions };
    }

    if (disabledRoutes) {
      query.routeId = { $nin: disabledRoutes };
    }

    return query;
  },

  /**
   * Gets the disabled routes.
   * A route may be disabled if the route's concurrency treshold has been met.
   * @return {Array}  Array of disabled route IDs.
   */
  getDisabledRouteIds() {
    const disabledRoutes = [];
    const runningRoutes = {};

    // disables routes if the concurrency treshold is met
    for (const worker of this.workers) {
      if (!worker.route) continue;

      const { concurrency, key: routeId } = worker.route;

      runningRoutes[routeId] = runningRoutes[routeId] || 0;
      runningRoutes[routeId]++;

      if (runningRoutes[routeId] === concurrency) {
        disabledRoutes.push(routeId);
      }
    }

    debug(`Getting disabled route IDs: ${inspect(disabledRoutes)}`);

    return disabledRoutes;
  },

  /**
   * Gets the running action IDs from the workers
   * @return {Array}  Action IDs currently in progress
   */
  getRunningActionIds() {
    return this.workers.reduce((ids, worker) => {
      if (worker.action) {
        ids.push(worker.action._id.toString());
      }

      return ids;
    }, []);
  }
};

/**
 * Creates a new engine
 * @param  {Object}  modules  Modules to use with this engine
 * @return {Object}           Newly created Engine instance
 */
export default function createEngine(modules) {
  const { assign, create } = Object;

  const engine = assign(create(Engine), emitterProto, { modules }, {
    running: false,
    workers: [],
    queue: new Queue(1, Infinity)
  });

  // Initializes the engine's event emitter
  createEmitter.call(engine);

  return engine;
}
