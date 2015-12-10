var os = require('os');
var env = process.env;

var NEST_WORKERS = env.NEST_WORKERS || os.cpus().length;
var DISABLED_ROUTES = env.DISABLED_ROUTES ? env.DISABLED_ROUTES.split(',') : null;

module.exports = {
  workers: parseInt(NEST_WORKERS, 10),

  // These routes will not be processed by the engine.
  disabledRoutes: DISABLED_ROUTES
};
