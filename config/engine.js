const os = require('os');

const { env } = process;
const NEST_WORKERS = env.NEST_WORKERS || (os.cpus().length * 2);
const DISABLED_ROUTES = (env.DISABLED_ROUTES
  ? env.DISABLED_ROUTES.split(',')
  : null
);

module.exports = {
  workers: parseInt(NEST_WORKERS, 10),

  // These routes will not be processed by the engine.
  disabledRoutes: DISABLED_ROUTES,
};
