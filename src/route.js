import invariant from 'invariant';
import { template, isFunction, isString, isArray, toArray } from 'lodash';
import logger from './logger';

const debug = logger.debug('nest:route');

/**
 * Initializes a new route handler.
 * @param  {Object}  route  Route definition object
 * @return {Object}         Initialized route instance
 */
export default function createRoute(route) {
  invariant(route.key, 'Key is required.');

  if (route.initialized) {
    return route;
  }

  debug('Creating new route handler', route);

  return Object.assign({}, route, {
    initialized: true,

    name: route.name || '',
    description: route.description || '',

    // template generation function. Takes an action for input
    urlGenerator: isFunction(route.url)
      ? route.url
      : (isString(route.url)
        ? template(route.url)
        : defaultUrlTemplate),

    // scraping function that should return an object with scraped data
    scraper: route.scraper || defaultScraper,

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

/**
 * Default scraper
 * @throws {Error} If route definition did not provide a scraper function
 */
function defaultScraper() {
  throw new Error('You need to implement your own scraper.');
}

/**
 * Default urlTemplate
 * @throws {Error} If route definition did not provide a url template
 */
function defaultUrlTemplate() {
  throw new Error('You need to implement your own URL generator.');
}

/**
 * Default error handler
 * @return {Boolean}  Returns true
 */
function defaultErrorHandler() {
  return true;
}

/**
 * Defaults status checker
 * @return {String}  Returns the string 'ok'
 */
function defaultCheckStatus() {
  return 'ok';
}
