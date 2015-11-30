import { EventEmitter } from 'events';
import inspect from 'util-inspect';
import Queue from 'promise-queue';
import { find } from 'lodash';
import engineConfig from '../config/engine';
import createWorker from './worker';
import Action from './db/Action';

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

  async assignAction(worker) {
    return await this.queue.add(async () => {
      debug(`Queue access`);

      const params = {
        disabledRoutes: this.getDisabledRoutes(),
        actionIds: this.getRunningActionIds()
      };

      const action = await Action.getNext(params);

      if (!action) {
        this.emit('action:noop');
      } else {
        const routeKey = action.routeId;
        const query = action.query;
        const route = find(this.routes, { key: routeKey });

        debug(`Got action: ${routeKey}. Query: ${query}`);

        worker.action = action;
        worker.route = route;
      }

      this.emit('action:assigned', action, worker);

      return action;
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
