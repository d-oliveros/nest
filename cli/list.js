/* eslint-disable vars-on-top */
/* eslint-disable no-var */
var padStart = require('string.prototype.padstart');
var getNestModules = require('../src/nest');

var rootdir = process.cwd();

module.exports = function listCommand() {
  var routes = getNestModules(rootdir).routes;

  if (routes.length === 0) {
    console.log('No routes available');
    process.exit(1);
  }

  console.log(`\n` +
    '--Available Routes--\n' +
    '* to scrape a route: nest scrape <route>\n' +
    prettyPrint(routes)
  );

  process.exit();
};

/**
 * returns the routes in a nicely formatted string
 * @param  {Object} routes Routes to use
 * @return {String}        Nicely formatted string
 */
function prettyPrint(routes) {
  var pad = 14;
  var string = '\n';

  // Pretty print the routes
  routes.forEach(function(route) {
    string += paddedPrint(pad, 'key: ', route.key);

    if (route.name) {
      string += paddedPrint(pad, 'name: ', route.name);
    }

    if (route.description) {
      string += paddedPrint(pad, 'description: ', route.description);
    }

    string += paddedPrint(pad, 'testable: ', route.test ? 'Yes' : 'No');

    string += '\n';
  });

  return string;
}

function paddedPrint(pad, string, suffix) {
  return padStart(string, pad) + suffix + '\n';
}
