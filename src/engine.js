import { find, isFunction, isArray, isObject, times } from 'lodash';
import inspect from 'util-inspect';
import PromiseQueue from 'promise-queue';
import invariant from 'invariant';
import { EventEmitter } from 'events';
import engineConfig from '../config/engine';
import { createWorker } from './worker';
import Queue from './db/queue';
import logger from './logger';

const debug = require('debug')('nest:engine');

/**
 * Creates a group of workers, and provides a worker loop
 * that will constantly process queue jobs.
 *
 * @class
 */
export default class Engine extends EventEmitter {

  /**
   * Instanciates a new engine.
   * @param  {Object}  modules  Modules to use with this engine
   */
  constructor(modules) {
    super();

    Object.assign(this, { modules }, {
      running: false,
      workers: [],
      queue: new PromiseQueue(1, Infinity)
    });
  }

  /**
   * Creates a new worker, links the worker's emitter to the engine's emitter
   *
   * @param {Object}  blueprint  Properties to augment the worker with
   * @return {Object}            The newly created worker
   */
  addWorker(blueprint) {
    const worker = createWorker(this, blueprint);
    worker.addEmitter(this);
    this.workers.push(worker);
  }

  /**
   * Creates the amount of workers defined in the environment
   * @see  /config/engine.js
   */
  assignWorkers() {
    if (this.running) return;

    // Create default workers
    times(engineConfig.workers, () => this.addWorker());

    // Create custom workers
    for (const blueprint of this.modules.workers) {
      const amount = blueprint.concurrency || engineConfig.workers;
      times(amount, () => this.addWorker(blueprint));
    }

    debug(`Created ${this.workers.length} workers`);
  }

  /**
   * Spawns workers, assign jobs to workers, and start each worker's loop.
   * @return {Promise}  Resolved when all the workers are assigned a job.
   */
  async start() {
    if (this.running) return;

    this.assignWorkers();
    this.running = true;

    const workerStartPromises = this.workers.map((worker) => worker.start());
    await Promise.all(workerStartPromises);

    return;
  }

  /**
   * Stops the workers.
   * @return {Promise}  Resolved when all the workers are stopped.
   */
  async stop() {
    if (!this.running) return;

    await Promise.all(this.workers.map((worker) => worker.stop()));

    this.running = false;
    this.workers.length = 0;
  }

  /**
   * Queries for a new job, and assigns the job to the worker
   * @param  {Object}  worker  Worker to assign the job to
   * @return {Object}          Fetched Job instance.
   */
  async assignJob(worker) {
    return await this.queue.add(async () => {
      debug(`Queue access`);
      debug(`Assigning job to worker ${worker.id}`);

      const query = this.getBaseJobQuery();

      if (worker.key) {
        query.worker = worker.key;
      }

      // extend the query with this worker's getJobQuery method
      if (isFunction(worker.getJobQuery)) {
        debug(`Getting worker custom job query`);

        try {
          const workerQuery = worker.getJobQuery() || {};

          invariant(isObject(workerQuery),
            `Invalid value returned from getJobQuery() (${worker.key})`);

          invariant(!isFunction(workerQuery.then),
            `Promises are not supported in worker's job query`);

          if (isObject(workerQuery)) {
            Object.assign(query, workerQuery);
          }
        } catch (err) {
          logger.error(err);
        }
      }

      debug(`Getting next job.\nQuery: ${inspect(query)}`);

      const job = await Queue
        .findOne(query)
        .sort({ priority: -1 })
        .exec();

      if (job) {
        const routeKey = job.routeId;
        const query = job.query;
        const route = find(this.modules.routes, { key: routeKey });

        debug(`Got job: ${routeKey}. Query: ${query}`);

        worker.job = job;
        worker.route = route;
      } else {
        debug(`No jobs`);
      }

      return job;
    });
  }

  /**
   * Gets the base query to be used to fetch a new job from the queue
   *
   * @return {Object}  Query
   */
  getBaseJobQuery() {
    const { disabledRouteIds, runningJobIds } = this;

    if (isArray(engineConfig.disabledRoutes)) {
      const globallyDisabledRoutes = engineConfig.disabledRoutes;
      Array.prototype.push.apply(disabledRouteIds, globallyDisabledRoutes);
    }

    const query = {
      'state.finished': false
    };

    if (runningJobIds.length) {
      if (runningJobIds.length === 1) {
        query._id = { $ne: runningJobIds[0] };
      } else {
        query._id = { $nin: runningJobIds };
      }
    }

    if (disabledRouteIds.length) {
      if (disabledRouteIds.length === 1) {
        query.routeId = { $ne: disabledRouteIds[0] };
      } else {
        query.routeId = { $nin: disabledRouteIds };
      }
    }

    return query;
  }

  /**
   * Gets the disabled routes.
   * A route may be disabled if the route's concurrency treshold has been met.
   * @return {Array}  Array of disabled route IDs.
   */
  get disabledRouteIds() {
    const disabledRoutes = [];
    const runningRoutes = {};

    // disables routes if the concurrency treshold is met
    for (const worker of this.workers) {
      debug('[route]', worker.route);
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
  }

  /**
   * Gets the running worker's job IDs.
   *
   * @return {Array}  Job IDs currently in progress
   */
  get runningJobIds() {
    return this.workers.reduce((ids, worker) => {
      if (worker.job) {
        ids.push(worker.job._id.toString());
      }

      return ids;
    }, []);
  }
}
