import { find, isFunction, isArray, isObject, isNumber, times } from 'lodash';
import PromiseQueue from 'promise-queue';
import assert from 'assert';
import { EventEmitter } from 'events';
import engineConfig from '../config/engine';
import createWorker from './worker';
import Queue from './db/queue';
import createRoute from './route';
import createMongoConnection from './db/connection';
import logger from './logger';

const debug = require('debug')('nest');

/**
 * Creates a group of workers, and provides a worker loop
 * that will constantly process queue jobs.
 *
 * @class
 */
export default class Nest extends EventEmitter {

  /**
   * Instanciates a new engine.
   * @param  {Object}  modules  Modules to use with this engine
   */
  constructor(params = {}) {
    super();

    const { routes, workers, mongo } = params;

    this.running = false;
    this.workers = [];
    this.pq = new PromiseQueue(1, Infinity);
    this.routes = isArray(routes) ? routes.map(createRoute) : [];
    this.connection = createMongoConnection(mongo);
    this.workersAmount = isNumber(workers) ? workers : engineConfig.workers;
  }

  /**
   * Spawns workers, assign jobs to workers, and start each worker's loop.
   * @return {Promise}  Resolved when all the workers are assigned a job.
   */
  async start() {
    if (this.running) return;

    // creates new workers, link the workers' emitters to the engine's emitter
    this.assignWorkers();

    debug(`Created ${this.workers.length} workers`);

    this.running = true;

    const workerStartPromises = this.workers.map((worker) => worker.start());
    await Promise.all(workerStartPromises);
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
   * Creates a new job. If the job already exists, returns the existing job.
   *
   * @param {String}    key   The job's route ID.
   * @param {Object}    data  The job's data.
   * @returns {Object}        The created (or existing) job.
   */
  async queue(key, params = {}) {
    const route = this.getRoute(key);
    assert(route, `Route ${key} does not exist`);
    assert(isObject(params), 'Params is not an object');

    return await Queue.createJob(key, {
      query: params.query,
      priority: params.priority || route.priority
    });
  }

  addRoute(route) {
    assert(isObject(route), 'Route must be an object');
    assert(route.key, 'Route must have a key');
    assert(!this.getRoute(route.key), `${route.key} was already added`);

    this.routes.push(createRoute(route));
  }

  /**
   * Gets a route definition by route key.
   *
   * @param  {String}  key  The route's key
   * @return {Object}       The route's definition
   */
  getRoute(key) {
    return find(this.routes, { key });
  }

  assignWorkers() {
    times(this.workersAmount, () => {
      const worker = createWorker(this);
      worker.addEmitter(this);
      this.workers.push(worker);
    });
  }

  /**
   * Queries for a new job, and assigns the job to the worker.
   * @param  {Object}  worker  Worker to assign the job to
   * @return {Object}          Fetched Job instance.
   */
  assignJob(worker) {
    return this.pq.add(async () => {
      debug('Queue access');
      debug(`Assigning job to worker ${worker.id}`);

      const query = this.getBaseJobQuery();

      if (worker.key) {
        query.worker = worker.key;
      }

      // extend the query with this worker's getJobQuery method
      if (isFunction(worker.getJobQuery)) {
        debug('Getting worker custom job query');

        try {
          const workerQuery = worker.getJobQuery() || {};

          assert(isObject(workerQuery),
            `Invalid value returned from getJobQuery() (${worker.key})`);

          assert(!isFunction(workerQuery.then),
            'Promises are not supported in worker\'s job query');

          if (isObject(workerQuery)) {
            Object.assign(query, workerQuery);
          }
        } catch (err) {
          logger.error(err);
        }
      }

      debug('Getting next job.\nQuery:', query);

      const job = await Queue
        .findOne(query)
        .sort({ priority: -1 })
        .exec();

      if (job) {
        const routeKey = job.routeId;
        const query = job.query;
        const route = this.getRoute(routeKey);

        debug(`Got job: ${routeKey}. Query: ${query}`);

        worker.job = job;
        worker.route = route;
      } else {
        debug('No jobs');
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
      if (!worker.route) continue;
      const { concurrency, key: routeId } = worker.route;

      runningRoutes[routeId] = runningRoutes[routeId] || 0;
      runningRoutes[routeId]++;

      if (runningRoutes[routeId] === concurrency) {
        disabledRoutes.push(routeId);
      }
    }

    debug('Getting disabled route IDs:', disabledRoutes);

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
