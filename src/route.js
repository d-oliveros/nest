import invariant from 'invariant';
import paramCase from 'param-case';
import { template, isObject, isFunction, isString } from 'lodash';
import logger from './logger';

const debug = logger.debug('Route');

export default function createRoute(route) {
  invariant(route.key, 'Key is required.');

  if (route.initialized) {
    return route;
  }

  debug('Creating new route', route);

  return Object.assign({}, route, {
    key: paramCase(route.key),
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

    // scraping function that should return either 'ok' or 'blocked'
    checkStatus: route.checkStatus || defaultCheckStatus,

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
export function populateRoutes(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && isObject(obj[key])) {
      if (isString(obj[key].key)) {
        obj[key] = createRoute(obj[key]);
      } else {
        populateRoutes(obj);
      }
    }
  }

  return obj;
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

// default status checker.
function defaultCheckStatus() {
  return 'ok';
}
