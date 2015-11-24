import { each, toArray, assign } from 'lodash';
import Item from '../Item';
import modules from '../modules';
import logger from '../logger';
import routes from '../../routes';

const debug = logger.debug('Spider:scrape');

export default async function scrape(operation) {
  const state = operation.state;

  const routeName = operation.route;
  const provider = operation.provider;
  const route = routes[provider][routeName];

  debug(`Starting operation: ${operation.routeId}` +
    (operation.query ? ` ${operation.query}` : ''));

  // save the starting time of this operation
  if (this.iteration === 0) {
    const startedDate = operation.wasNew ? operation.created : Date.now();
    operation.state.startedDate = startedDate;
  }

  // create the URL using the operation's parameters
  const url = route.urlTemplate(operation);

  this.emit('operation:start', operation, url);

  // check if this operation is actually finished
  if (state.finished) {
    this.emit('operation:finish', operation);
    return operation;
  }

  // opens the page
  const page = await this.open(url, { dynamic: route.isDynamic });
  const status = await page.evaluate(route.checkStatus);

  if (status === 'blocked') {
    // IP has been blocked
    debug('Operation blocked. Retrying in 5s...');
    this.emit('operation:blocked', operation, url);
    await sleep(5000);
    return await this.scrape(operation);
  }

  // scapes the page
  let scraped = await page.evaluate(route.scraper);
  this.emit('scraped:raw', scraped, operation);

  scraped = this.sanitizeScraped(scraped);

  each(scraped.items, (item) => {
    item.provider = provider;
    item.route = routeName;
    item.routeWeight = route.priority;
  });

  // apply modules and route-specific middleware
  scraped = await route.middleware(scraped);

  for (const mod of toArray(modules)) {
    try {
      scraped = await mod(scraped) || scraped;
    } catch (err) {
      logger.error(err);
    }
  }

  // spawn new scraping operations
  if (scraped.operations.length === 0) {
    debug('No operations to spawn');
  } else {
    debug('Spawning operations');
    const promises = scraped.operations.map(async ({ provider, route, query }) => {
      const targetRouteId = `${provider}:${route}`;
      const targetRoute = routes[provider][route];

      if (!targetRoute) {
        debug(
          `Warning: ${operation.routeId} ` +
          `wanted to scrape ${targetRouteId}, ` +
          `but that route does not exists`);
      } else {
        const newOperation = await targetRoute.initialize(query);
        return newOperation;
      }
    });

    const newOperations = await Promise.all(promises);

    debug(`Operations spawned: ${newOperations.length} operations.`);
    this.emit('operations:created', newOperations);

    operation.stats.spawned += newOperations.length;
  }

  // change state
  if (scraped.hasNextPage) {
    state.currentPage++;
  } else {
    state.finished = true;
    state.finishedDate = Date.now();
  }

  if (scraped.state) {
    state.data = assign(state.data || {}, scraped.state);
  }

  state.lastLink = url;

  const results = await Item.eachUpsert(scraped.items);

  this.iteration++;
  operation.stats.pages++;
  operation.stats.items += results.created;
  operation.stats.updated += results.updated;

  this.emit('scraped:page', results, operation);
  this.stopPhantom();

  debug('Saving operation');
  await operation.save();

  // if the operation has been stopped
  if (!this.running) {
    this.emit('operation:stopped', operation);
  }

  // Operation finished
  if (!this.running || state.finished) {
    this.emit('operation:finish', operation);
  } else {
    // Operation has not finished finished
    this.emit('operation:next', operation);
    return await this.scrape(operation);
  }

  return operation;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
