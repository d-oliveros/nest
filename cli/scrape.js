import debug from 'debug';

// enable Worker messages
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').createNest;
const rootdir = process.cwd();

export default async function scrapeCommand(routeName, query) {
  try {
    const nest = createNest(rootdir);
    const route = find(nest.routes, { key: routeName });

    if (!route) {
      console.log(`Route "${routeName}" not found`);
      process.exit(4);
    }

    const operation = await nest.scrape(route, query);

    console.log(`Finished scraping "${route.name}" route. Operation stats:`);
    console.log(JSON.stringify(operation, null, 3));

    process.exit(0);

  } catch (err) {
    console.error(err.stack);
    process.exit(8);
  }
}
