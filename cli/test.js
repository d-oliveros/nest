const find = require('lodash').find;
const startRouteTests = require('../test/routes');
const getNestModules = require('../lib/nest').getNestModules;

const root = process.cwd();

/**
 * Runs the automated route tests.
 * @param  {String}  routeKey  Route to test. (optional)
 */
module.exports = function testCommand(routeKey) {
  const { routes } = getNestModules(root);

  // only run a single test
  if (routeKey && !find(routes, { key: routeKey })) {
    console.log(`Route "${routeKey}" not found`);
    process.exit(4);
  }

  // Load the route tests
  const params = {
    routes,
    onlyRouteId: routeKey,
    dataDir: root
  };

  startRouteTests(params)
    .then(() => process.exit(0))
    .catch((err) => {
      if (typeof err === 'object' && !err.failureCount) {
        console.error(err.stack);
      }
      process.exit(8);
    });
};
