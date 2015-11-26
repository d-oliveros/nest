var os = require('os');
var ENGINE_WORKERS = process.env.ENGINE_WORKERS || os.cpus().length;

module.exports = {
  workers: parseInt(ENGINE_WORKERS, 10),

  // These routes will not be processed by the engine.
  disabledRoutes: []
};
