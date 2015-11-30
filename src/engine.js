import { EventEmitter } from 'events';
import inspect from 'util-inspect';
import Queue from 'promise-queue';
import { find } from 'lodash';
import engineConfig from '../config/engine';
import createWorker from './worker';
import Operation from './db/Operation';

const debug = require('debug')('nest:engine');

const engineProto = {
  running: false,

  async start() {
    if (this.running) return;

    this.running = true;

    for (let i = 0; i < engineConfig.workers; i++) {
      const worker = createWorker(this);
      this.workers.push(worker);
    }

    debug(`Created ${this.workers.length} workers`);

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

  async assignOperation(worker) {
    return await this.queue.add(async () => {
      debug(`Queue access`);

      const params = {
        disabledRoutes: this.getDisabledRoutes(),
        operationIds: this.getRunningOperationIds()
      };

      const operation = await Operation.getNext(params);

      if (!operation) {
        this.emit('operation:noop');
      } else {
        const routeKey = operation.routeId;
        const query = operation.query;
        const route = find(this.routes, { key: routeKey });

        debug(`Got operation: ${routeKey}. Query: ${query}`);

        worker.operation = operation;
        worker.route = route;
      }

      this.emit('operation:assigned', operation, worker);

      return operation;
    });
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

  getRunningOperationIds() {
    return this.workers.reduce((ids, worker) => {
      if (worker.operation) {
        ids.push(worker.operation._id.toString());
      }

      return ids;
    }, []);
  }
};

const composedProto = Object.assign({}, EventEmitter.prototype, engineProto);

export default function createEngine(routes, plugins) {
  const engine = Object.assign(Object.create(composedProto), {
    routes: routes,
    plugins: plugins,
    workers: [],
    queue: new Queue(1, Infinity)
  });

  // Initializes the event emitter in the engine
  EventEmitter.call(engine);

  return engine;
}
