import cheerio from 'cheerio';
import inspect from 'util-inspect';
import invariant from 'invariant';
import { isString, isObject, isFunction } from 'lodash';
import logger from './logger';

const pageProto = {
  data: null,
  location: null,
  isJSON: false,
  valid: false,
  html: null,
  $: null,

  apply(func) {
    let res;

    try {
      res = func.call(this, this.isJSON ? this.data : this.$);

      // Convert sync functions to promises
      if (!isObject(res) || !isFunction(res.then)) {
        res = Promise.resolve(res);
      }
    } catch (err) {
      logger.error(err);
      return Promise.reject(err);
    }

    return res;
  },

  loadData(url, data) {
    invariant(url && isString(url), 'URL is not a string');

    this.data = data;
    this.location = { href: url };
    this.valid = !!data;

    // Checks if the data is JSON
    // If the data is JSON, parses the json in 'page.data'
    // Otherwise, load the HTML with cheerio and expose it in 'page.$`
    try {
      this.data = JSON.parse(data);
      this.isJSON = true;
    } catch (err) {
      if (data && isString(data)) {
        this.html = data;
        this.$ = cheerio.load(data);
      } else {
        logger.warn(`[page]: Data is not valid: ${inspect(data)}`);
        this.valid = false;
      }
    }
  }
};

export default function createPage(url, data) {
  const page = Object.create(pageProto);
  page.loadData(url, data);
  return page;
}
