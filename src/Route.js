import invariant from 'invariant';
import { template } from 'lodash';
import logger from './logger';

const debug = logger.debug('Route');

export default class Route {
  constructor(params) {
    invariant(params.name, 'Name is required.');
    invariant(params.provider, 'Provider is required.');

    debug('Creating new route', params);

    this.title = params.title;
    this.provider = params.provider;
    this.name = params.name;
    this.isDynamic = params.dynamic || false;

    // template generation function. Takes an operation for input
    this.urlTemplate = template(params.url);

    // scraping function that should return an object with scraped data
    this.scraper = params.scraper || this.scraper;

    // route-specific middleware to be executed after scraping data from a page
    this.middleware = params.middleware || this.middleware;

    // scraping function that should return either 'ok' or 'blocked'
    this.checkStatus = params.checkStatus || this.checkStatus;

    // auto-testing options
    this.test = params.test || null;

    // limit the amount of workers that can work on this route at the same time
    this.concurrency = params.concurrency || null;

    // routes with higher priority will be processed first by the workers
    this.priority = params.priority;

    if (typeof this.priority !== 'number') {
      this.priority = 50;
    }
  }

  // default scraper
  scraper() {
    throw new Error('You need to implement your own scraper.');
  }

  // default urlTemplate
  urlTemplate() {
    throw new Error('You need to implement your own URL generator.');
  }

  // default middleware
  async middleware(scraped) {
    return scraped;
  }

  // default status checker.
  checkStatus() {
    return 'ok';
  }
}
