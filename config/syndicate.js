var os = require('os');
var NEST_WORKERS = process.env.NEST_WORKERS || os.cpus().length;

module.exports = {
  workers: parseInt(NEST_WORKERS, 10),

  // These routes will not be processed by the engine.
  disabledRoutes: []
};
