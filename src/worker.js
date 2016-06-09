import shortid from 'shortid';
import invariant from 'invariant';
import { isObject, isFunction, pick, find } from 'lodash';
import { createSpider, spiderProto } from './spider';
import { EventEmitter } from 'events';
import { chainableEmitterProto as chainableEmitter } from './emitter';
import Queue from './db/queue';
import Item from './db/item';
import logger from './logger';

const debug = logger.debug('nest:worker');
const emitterProto = EventEmitter.prototype;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { assign, create } = Object;

/**
 * Creates a new worker instance.
 *
 * @param  {Object}  engine     The engine this worker is part of
 * @param  {Object}  blueprint  Augmented properties to be assigned to the worker
 * @return {Object}             A worker instance
 */
export const createWorker = function(engine, blueprint) {
  invariant(isObject(engine), 'Engine is not an object');

  // constructs a new worker
  const worker = assign(create(workerProto), emitterProto, chainableEmitter, {
    id: shortid.generate(),
    engine: engine,
    emitters: new Set(),
    running: false,
    spider: null,
    route: null,
    job: null,
    meta: {}
  });

  const extendableProperties = [
    'key',
    'concurrency',
    'initialize',
    'getJob'
  ];

  // Augments the instance with the provided properties
  if (isObject(blueprint)) {
    assign(worker, pick(blueprint, extendableProperties));
  }

  EventEmitter.call(worker);

  debug(`Worker ${worker.id} created`);

  return worker;
};

const workerProto = {

  /**
   * Start this worker.
   *
   * @return {Promise}
   *  Promise to be resolved when this worker is assigned its first job
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
      this.once('job:assigned', (job, worker) => {
        if (worker === this) {
          debug(`Worker ${this.id} started`);
          resolve();
        }
      });

      this.startLoop();
    });
  },

  /**
   * Starts the worker loop.
   * @return {Promise}  Promise to be resolved when the worker loop ends
   */
  async startLoop() {
    invariant(this.running, 'Worker must be running to start the worker loop');

    while (this.running) {
      let job;

      // get the next job
      try {
        job = await this.engine.assignJob(this);
        this.emit('job:assigned', job, this);
      } catch (err) {
        logger.error(err);
        this.stop();
        continue;
      }

      if (!this.running) {
        continue;
      }

      if (!job) {
        this.emit('job:noop', this);
        debug('There are no pending jobs. Retrying in 1s');
        await sleep(1000); // keeps quering every second
        continue;
      }

      // process the job
      try {
        this.emit('job:start', job, this);
        job = await this.startJob(job);

        invariant(isObject(job) && isObject(job.stats),
          'New job state is not valid');

      } catch (err) {
        if (isObject(err)) {
          if (err.statusCode) {
            debug(`Got ${err.statusCode}. Continuing...`);
          } else {
            logger.error(err);
          }
        }
        continue;
      }

      debug(
        `Job finished: ${job.routeId}. ` +
        `${job.stats.items} items created. ` +
        `${job.stats.updated} items updated. ` +
        `${job.stats.spawned} jobs created.`);

      // check if should reinitialize
      try {
        if (job.shouldReinitialize) {
          debug(`Worker reinitializing`);
          await this.initialize();
        }
      } catch (err) {
        logger.error(err);
        this.stop();
        continue;
      }

      this.job = null;
      this.route = null;
    }

    this.emit('worker:stopped', this);
  },

  /**
   * Runs a job.
   *
   * @param  {Object}  job  Job instance
   * @return {Promise}          Updated job
   */
  async startJob(job) {
    invariant(isObject(job), 'Job is not valid');
    invariant(this.running, 'Worker is not running');

    const { state, routeId, query } = job;
    const routes = this.engine.modules.routes;
    const route = find(routes, { key: routeId });

    if (state.finished) {
      debug('Job was already finished');
      return job;
    }

    // save the starting time of this job
    if (job.wasNew) {
      state.startedDate = Date.now();
    }

    let msg = `Starting job: ${routeId} ${query}`;
    if (state.currentPage > 2) msg += ` (page ${state.currentPage})`;
    debug(msg);

    let scraped;

    if (isFunction(this.process)) {
      // if the worker provides a custom processor
      scraped = await this.process(job, route);
      scraped = spiderProto.sanitizeScraped(scraped);
    } else {
      // else, scrape this route using a spider
      const url = route.getUrl(job);
      this.spider = createSpider();
      scraped = await this.spider.scrape(url, route);
    }

    if (!this.running) {
      return job;
    }

    const newOps = await this.spawnJobs(scraped.jobs, routes);

    if (newOps.length) {
      this.emit('jobs:created', newOps);
      job.stats.spawned += newOps.length;
    }

    // save and update items
    const results = await Item.eachUpsert(scraped.items);
    results.jobsCreated = newOps.length;

    // change state
    if (scraped.hasNextPage) {
      state.currentPage++;
    } else {
      state.finished = true;
      state.finishedDate = Date.now();
    }

    if (scraped.state) {
      state.data = assign(state.data || {}, scraped.state);
    }

    job.stats.pages++;
    job.stats.items += results.created;
    job.stats.updated += results.updated;
    job.updated = new Date();

    this.iteration++;
    this.emit('scraped:page', results, job);

    debug('Saving job');
    await job.save();

    if (route.transitionDelay) {
      debug(`Sleeping for ${route.transitionDelay}ms`);
      await sleep(route.transitionDelay);
    }

    // Job finished
    if (state.finished || !this.running) {
      return job;
    }

    // Job has next page
    debug(`Scraping next page`);
    this.emit('job:next', job);

    return await this.startJob(job);
  },

  /**
   * Creates new scraping jobs.
   *
   * @param  {Array}  jobs  Jobs to create
   * @return {Promise}      Array with spawned jobs
   */
  async spawnJobs(jobs) {
    const routes = this.engine.modules.routes;

    if (jobs.length === 0) {
      debug('No jobs to spawn');
      return [];
    }

    debug('Spawning jobs');

    const newJobs = await Promise.all(jobs.map((op) => {
      const { routeId, query } = op;
      const targetRoute = find(routes, { key: routeId });

      if (!targetRoute) {
        logger.warn(`[spawnJobs]: Route ${routeId} does not exist`);
        return Promise.resolve();
      }

      // Create a new job
      return Queue.createJob(targetRoute.key, {
        priority: targetRoute.priority,
        query: query
      });
    }));

    debug(`Jobs spawned: ${newJobs.length} jobs`);

    return newJobs;
  },

  /**
   * Stops this worker and its spider, if any.
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

  initialize: function defaultInitializer() {},
  getJob: function defaultJobQueryFactory() {}
};
