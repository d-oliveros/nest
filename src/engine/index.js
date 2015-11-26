import { pick } from 'lodash';
import { EventEmitter } from 'events';
import inspect from 'util-inspect';
import Queue from 'promise-queue';
import Worker from './worker';
import engineConfig from '../../config/engine';
import Operation from '../Operation';

const debug = require('debug')('engine');

export default class Engine extends EventEmitter {
  constructor(routes, plugins) {
    super();

    this.workers = [];
    this.running = false;
    this.routes = routes;
    this.plugins = plugins;
    this.queue = new Queue(1, Infinity);

    process.on('SIGTERM', () => {
      this.workers.forEach((worker) => worker.stop());
    });
  }

  async start() {
    if (this.running) return;

    this.running = true;

    for (let i = 0; i < engineConfig.workers; i++) {
      const worker = new Worker(this);
      this.workers.push(worker);
    }

    debug(`Created ${this.workers.length} workers`);

    const workerStartPromises = this.workers.map((worker) => worker.start());
    const initialOps = await Promise.all(workerStartPromises);

    return initialOps;
  }

  async stop() {
    if (!this.running) return;

    this.running = false;
    this.workers = [];

    return await Promise.all(this.workers.map((worker) => worker.stop()));
  }

  async assignOperation(worker) {
    return await this.queue.add(async () => {
      const params = pick(this, 'disabledRoutes', 'operationIds');
      const operation = await Operation.getNext(params);

      if (!operation) {
        this.emit('operation:noop');
      } else {
        const routeName = operation.route;
        const provider = operation.provider;
        const query = operation.query;
        const route = this.routes[provider][routeName];

        debug(`Got operation: ${provider}->${routeName}. Query: ${query}`);

        worker.operation = operation;
        worker.route = route;
      }

      this.emit('operation:assigned', operation, worker);

      return operation;
    });
  }

  get disabledRoutes() {
    const disabledRoutes = [];
    const runningRoutes = {};

    // disables routes if the concurrency treshold is met
    for (const worker of this.workers) {
      if (!worker.route) continue;

      const { provider, name, concurrency } = worker.route;
      const routeId = `${provider}:${name}`;

      runningRoutes[routeId] = runningRoutes[routeId] || 0;
      runningRoutes[routeId]++;

      if (runningRoutes[routeId] === concurrency) {
        disabledRoutes.push(routeId);
      }
    }

    debug(`Getting disabled routes: ${inspect(disabledRoutes)}`);

    return disabledRoutes;
  }

  get operationIds() {
    return this.workers.reduce((ids, worker) => {
      if (worker.operation) {
        ids.push(worker.operation.id);
      }

      return ids;
    }, []);
  }
}
