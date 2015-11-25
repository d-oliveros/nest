import { each } from 'lodash';

// Exports: Engine state object
const engineState = {
  workers: [],

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
  },

  get operationIds() {
    return engineState.workers.reduce((ids, worker) => {
      if (worker.operation) {
        ids.push(worker.operation.id);
      }

      return ids;
    }, []);
  }
};

export default engineState;
