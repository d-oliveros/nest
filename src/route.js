import assert from 'assert';
import { template, isFunction, isString } from 'lodash';
import logger from './logger';

const debug = logger.debug('nest:route');

/**
 * Initializes a new route handler.
 * @param  {Object}  route  Route definition object
 * @return {Object}         Initialized route instance
 */
export default function createRoute(route) {
  assert(route.key, 'Key is required.');

  if (route.initialized) {
    return route;
  }

  debug('Creating new route handler', route);

  return {
    initialized: true,

    key: route.key,
    url: route.url,
    name: route.name || '',
    description: route.description || '',

    // template generation function. Takes a job for input
    getUrl: isFunction(route.url)
      ? route.url
      : (isString(route.url)
        ? template(route.url)
        : () => {
          throw new Error('You need to implement your own URL generator.');
        }),

    // scraping function that should return an object with scraped data
    scraper: route.scraper ? route.scraper : () => {
      throw new Error('You need to implement your own scraper.');
    },

    // scraping function that can return a status code or throw an error
    checkStatus: route.checkStatus ? route.checkStatus : () => 'ok',

    // function to be called when the route returns an error code >= 400
    // if an job is returned, the spider will be redirected to this job
    // if a truthy value is returned, the spider will retry this route
    onError: route.onError ? route.onError : async () => true,

    // auto-testing options
    test: route.test || null,

    // limit the amount of workers that can work on this route at the same time
    concurrency: route.concurrency || -1,

    // adds a delay to page transitions
    transitionDelay: route.transitionDelay || 0,

    // how many times to retry fetching a route on 4xx errors
    retryCount: route.retryCount,

    // routes with higher priority will be processed first by the workers
    priority: isNaN(route.priority) ? 50 : parseInt(route.priority, 10)
  };
}
