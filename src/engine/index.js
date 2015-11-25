import { each } from 'lodash';
import { EventEmitter } from 'events';
import Worker from './worker';
import engineConfig from '../../config/engine';
import Operation from '../Operation';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default class Engine extends EventEmitter {
  constructor(routes, plugins) {
    super();

    this.started = false;
    this.busy = false;
    this.workers = [];
    this.routes = routes;
    this.plugins = plugins;
  }

  start() {
    if (this.started) return;

    for (let i = 0; i < engineConfig.workers; i++) {
      const worker = new Worker(this);
      this.workers.push(worker);
    }

    this.started = true;
  }

  async stop() {
    for (const worker of this.workers) {
      await worker.stop();
    }

    this.started = false;
    this.workers = [];
  }

  async waitForNext() {
    if (this.busy) {
      await sleep(30);
      return await this.waitForNext();
    }
    const { disabledRoutes, operationIds } = this;

    this.busy = true;
    const operation = await Operation.getNext({ disabledRoutes, operationIds });
    this.busy = false;

    return operation;
  }

  get disabledRoutes() {
    const disabledRoutes = [];
    const runningRoutes = {};

    // disables routes if the concurrency treshold is met
    each(this.workers, (worker) => {
      if (!worker.route) return;

      const { provider, name, concurrency } = worker.route;
      const routeId = `${provider}:${name}`;

      runningRoutes[routeId] = runningRoutes[routeId] || 0;
      runningRoutes[routeId]++;

      if (runningRoutes[routeId] === concurrency) {
        disabledRoutes.push(routeId);
      }
    });

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
