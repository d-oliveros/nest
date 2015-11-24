
// Exports: Engine state object
const engineState = {
  workers: []
};

// worker objects being executed right now
engineState.workers = [];

// Property: operationIds
Object.defineProperty(engineState, 'operationIds', {
  get: () => {
    return engineState.workers.reduce((ids, worker) => {
      if (worker.operation) {
        ids.push(worker.operation.id);
      }

      return ids;
    }, []);
  }
});

export default engineState;
