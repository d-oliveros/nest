import camelCase from 'camelcase';
import debug from 'debug';

// enable Worker messages
debug.enable('Worker');
debug.enable('Spider*');
debug.enable('Item*');

const createNest = require('../src/nest').createNest;
const rootdir = process.cwd();

export default async function scrapeCommand(route, query) {
  route = camelCase(route);

  try {
    const nest = createNest(rootdir);
    const operation = await nest.scrape(nest.routes[route], query);

    console.log('Finished scraping ' + route + ' route. Operation stats:');
    console.log(JSON.stringify(operation, null, 3));

    process.exit(0);

  } catch (err) {
    console.error(err.stack);
    process.exit(8);
  }
}
