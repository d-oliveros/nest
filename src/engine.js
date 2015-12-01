import { EventEmitter } from 'events';
import inspect from 'util-inspect';
import Queue from 'promise-queue';
import invariant from 'invariant';
import { find, isFunction, isObject, times, map, pluck } from 'lodash';
import engineConfig from '../config/engine';
import createWorker from './worker';
import logger from './logger';
import Action from './db/Action';

const debug = require('debug')('nest:engine');

const engineProto = {
  running: false,

  async start() {
    if (this.running) return;

    const stats = {};
    this.running = true;

    // Create default workers
    times(engineConfig.workers, () => {
      const worker = createWorker(this);
      this.workers.push(worker);
      stats[worker.key] = stats[worker.key] || 0;
      stats[worker.key]++;
    });

    // Create custom workers
    for (const workerDefinition of this.modules.workers) {
      const amount = workerDefinition.concurrency || engineConfig.workers;

      times(amount, () => {
        const worker = createWorker(this, workerDefinition);
        this.workers.push(worker);
        stats[worker.key] = stats[worker.key] || 0;
        stats[worker.key]++;
      });
    }

    const msg = map(stats, (amount, key) => {
      return `${amount} ${key} workers`;
    });

    if (msg.length === 0) {
      debug(`No workers created`);
    } else {
      debug(`Created ${msg.join(' and ')}`);
    }

    const workerStartPromises = this.workers.map((worker) => worker.start());
    const initialOps = await Promise.all(workerStartPromises);

    return initialOps;
  },

  async stop() {
    if (!this.running) return;

    this.running = false;
    this.workers = [];

    return await Promise.all(this.workers.map((worker) => worker.stop()));
  },

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

  getBaseActionQuery() {
    const runningActions = this.getRunningActionIds();
    const disabledRoutes = this.getDisabledRoutes();
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

  getDisabledRoutes() {
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

    debug(`Getting disabled routes: ${inspect(disabledRoutes)}`);

    return disabledRoutes;
  },

  getRunningActionIds() {
    return this.workers.reduce((ids, worker) => {
      if (worker.action) {
        ids.push(worker.action._id.toString());
      }

      return ids;
    }, []);
  }
};

const composedProto = Object.assign({}, EventEmitter.prototype, engineProto);

export default function createEngine(modules) {
  const engine = Object.assign(Object.create(composedProto), { modules }, {
    workers: [],
    queue: new Queue(1, Infinity)
  });

  // Initializes the event emitter in the engine
  EventEmitter.call(engine);

  return engine;
}
