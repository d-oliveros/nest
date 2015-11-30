import invariant from 'invariant';
import { template, isFunction, isString, isArray, toArray } from 'lodash';
import logger from './logger';

const debug = logger.debug('nest:route');

export default function createRoute(route) {
  invariant(route.key, 'Key is required.');

  if (route.initialized) {
    return route;
  }

  debug('Creating new route', route);

  return Object.assign({}, route, {
    initialized: true,
    name: route.name || '',
    description: route.description || '',

    isDynamic: route.dynamic || false,
    isStatic: !route.dynamic || true,

    // template generation function. Takes an operation for input
    urlGenerator: isFunction(route.url)
      ? route.url
      : (isString(route.url)
        ? template(route.url)
        : defaultUrlTemplate),

    // scraping function that should return an object with scraped data
    scraper: route.scraper || defaultScraper,

    // route-specific middleware to be executed after scraping data from a page
    middleware: route.middleware || defaultMiddleware,

    // scraping function that can return a status code or throw an error
    checkStatus: route.checkStatus || defaultCheckStatus,

    // function to be called when the route returns an error code >= 400
    // if an action is returned, the spider will be redirected to this action
    // if a truthy value is returned, the spedir will retry this route
    onError: route.onError || defaultErrorHandler,

    // auto-testing options
    test: route.test || null,

    // limit the amount of workers that can work on this route at the same time
    concurrency: route.concurrency || -1,

    // routes with higher priority will be processed first by the workers
    priority: isNaN(route.priority) ? 50 : parseInt(route.priority, 10)
  });
}

/**
 * Populates the routes in the provided object recursively
 * @param  {Object} obj Object to populate routes on
 * @return {Object}     The populated object
 */
export function populateRoutes(routes) {
  if (!isArray(routes)) routes = toArray(routes);

  const newRoutes = routes.slice();

  newRoutes.forEach((route, i) => {
    if (isString(route.key)) {
      newRoutes[i] = createRoute(route);
    } else {
      populateRoutes(newRoutes);
    }
  });

  return newRoutes;
}

// default scraper
function defaultScraper() {
  throw new Error('You need to implement your own scraper.');
}

// default urlTemplate
function defaultUrlTemplate() {
  throw new Error('You need to implement your own URL generator.');
}

// default middleware
function defaultMiddleware(scraped) {
  return scraped;
}

function defaultErrorHandler() {
  return true;
}

// default status checker.
function defaultCheckStatus() {
  return 'ok';
}
