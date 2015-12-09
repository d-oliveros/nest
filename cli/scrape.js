/* eslint-disable vars-on-top */
/* eslint-disable no-var */
var debug = require('debug');
var find = require('lodash').find;

// enable Worker messages
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

var createNest = require('../lib/nest').default;
var rootdir = process.cwd();

module.exports = function scrapeCommand(routeName, query) {
  try {
    var nest = createNest(rootdir);
    var route = find(nest.routes, { key: routeName });

    if (!route) {
      console.log('Route "' + routeName + '" not found');
      process.exit(4);
    }

    nest.scrape(route, query)
      .then(function(stats) {
        console.log('Finished scraping "' + route.name + '" route. Operation stats:');
        console.log(JSON.stringify(stats, null, 3));
        process.exit(0);
      })
      .catch(function(err) {
        throw err;
      });
  } catch (err) {
    console.error(err.stack);
    process.exit(8);
  }
};
