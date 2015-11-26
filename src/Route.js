import invariant from 'invariant';
import { template } from 'lodash';
import logger from './logger';

const debug = logger.debug('Route');

// default scraper
const defaultScraper = function() {
  throw new Error('You need to implement your own scraper.');
};

// default urlTemplate
const defaultUrlTemplate = function() {
  throw new Error('You need to implement your own URL generator.');
};

// default middleware
const defaultMiddleware = function(scraped) {
  return scraped;
};

// default status checker.
const defaultCheckStatus = function() {
  return 'ok';
};

export default function createRoute(params) {
  invariant(params.name, 'Name is required.');
  invariant(params.provider, 'Provider is required.');

  debug('Creating new route', params);

  return {
    title: params.title,
    provider: params.provider,
    name: params.name,
    isDynamic: params.dynamic || false,

    // template generation function. Takes an operation for input
    urlTemplate: params.url ? template(params.url) : defaultUrlTemplate,

    // scraping function that should return an object with scraped data
    scraper: params.scraper || defaultScraper,

    // route-specific middleware to be executed after scraping data from a page
    middleware: params.middleware || defaultMiddleware,

    // scraping function that should return either 'ok' or 'blocked'
    checkStatus: params.checkStatus || defaultCheckStatus,

    // auto-testing options
    test: params.test || null,

    // limit the amount of workers that can work on this route at the same time
    concurrency: params.concurrency || null,

    // routes with higher priority will be processed first by the workers
    priority: isNaN(params.priority) ? 50 : parseInt(params.priority, 10)
  };
}
