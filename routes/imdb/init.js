import Operation from '../../src/Operation';
import createSpider from '../../src/spider';
import routes from '../../routes';
import plugins from '../../plugins';
import searchRoute from '../imdb/search';

// Exports: Scraping initialization script
//
// Starts the movie search route operation on IMDB sorted by user rating count
// this operation can go all the way up to 100k items
//
exports.start = function() {
  console.log('IMDB Movie Search Route Starting...');
  startOperation(null, searchRoute);
};

async function startOperation(query, route) {
  const spider = createSpider();
  const operation = await Operation.findOrCreate(query, route);
  return await spider.scrape(operation, { routes, plugins });
}
