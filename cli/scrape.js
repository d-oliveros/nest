const debug = require('debug');
const find = require('lodash').find;

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const Nest = require('../index');

const rootdir = process.cwd();

/**
 * Scrapes a route.
 *
 * @param  {String}  routeName  Name of the route to use.
 * @param  {String}  query      Query to use when building the target URL.
 */
module.exports = function scrapeCommand(routeName, query) {
  const nest = new Nest(rootdir);
  const route = find(nest.routes, { key: routeName });

  if (!route) {
    console.log(`Route "${routeName}" not found`);
    process.exit(4);
  }

  nest.scrape(route, query)
    .then((stats) => {
      console.log(`Finished scraping "${route.name}" route. Operation stats:`);
      console.log(JSON.stringify(stats, null, 3));

      process.exit(0);
    })
    .catch((err) => {
      console.error(err.stack);
      process.exit(8);
    });
};
