/* eslint-disable vars-on-top */
/* eslint-disable no-var */
require('../test/testenv');

var find = require('lodash').find;
var startRouteTests = require('../test/routes').startRouteTests;
var getNestModules = require('../lib/nest').getNestModules;

var root = process.cwd();

module.exports = function testCommand(routeKey) {
  try {
    var routes = getNestModules(root).routes;

    // only run a single test
    if (routeKey && !find(routes, { key: routeKey })) {
      console.log('Route "' + routeKey + '" not found');
      process.exit(4);
    }

    var routeParams = {
      routes: routes,
      onlyRouteId: routeKey,
      dataDir: root
    };

    // Load the route tests
    startRouteTests(routeParams)
      .then(function() {
        process.exit(0);
      })
      .catch(function(err) {
        throw err;
      });
  } catch (err) {
    if (typeof err === 'object' && !err.failureCount) {
      console.error(err.stack);
    }
    process.exit(8);
  }
};
