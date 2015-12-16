import debug from 'debug';
import { find } from 'lodash';

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').default;
const rootdir = process.cwd();

/**
 * Scrapes a route.
 *
 * @param  {String}  routeName  Name of the route to use.
 * @param  {String}  query      Query to use when building the target URL.
 */
export default async function scrapeCommand(routeName, query) {
  try {
    const nest = createNest(rootdir);
    const route = find(nest.routes, { key: routeName });

    if (!route) {
      console.log(`Route "${routeName}" not found`);
      process.exit(4);
    }

    const stats = await nest.scrape(route, query);

    console.log(`Finished scraping "${route.name}" route. Operation stats:`);
    console.log(JSON.stringify(stats, null, 3));

    process.exit(0);

  } catch (err) {
    console.error(err.stack);
    process.exit(8);
  }
}
