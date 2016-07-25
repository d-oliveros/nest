const padStart = require('string.prototype.padstart');
const getNestModules = require('../lib/nest').getNestModules;

const rootdir = process.cwd();

/**
 * Prints the available routes to console.
 */
module.exports = function listCommand() {
  const routes = getNestModules(rootdir).routes;

  if (routes.length === 0) {
    console.log('No routes available');
    process.exit(1);
  }

  console.log('\n' + // eslint-disable-line
    '--Available Routes--\n' +
    '* to scrape a route: nest scrape <key>\n' +
    prettyPrint(routes)
  );

  process.exit();
};

/**
 * Returns the routes in a nicely formatted string.
 *
 * @param  {Object} routes Routes to use
 * @return {String}        Nicely formatted string
 */
function prettyPrint(routes) {
  const pad = 14;
  let string = '\n';

  // pretty print the routes
  routes.forEach((route) => {
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
  return `${padStart(string, pad)}${suffix}\n`;
}
