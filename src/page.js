import cheerio from 'cheerio';
import inspect from 'util-inspect';
import invariant from 'invariant';
import createError from 'http-errors';
import { isString, isObject, isFunction } from 'lodash';
import logger from './logger';

const pageProto = {
  data: null,
  location: null,
  isJSON: false,
  valid: false,
  html: null,
  phantomPage: null,
  statusCode: null,
  res: null,
  $: null,

  async runInContext(func) {
    let res;

    try {
      res = func.call(this, this.isJSON ? this.data : this.$, this);

      // Convert sync functions to promises
      if (!isObject(res) || !isFunction(res.then)) {
        res = Promise.resolve(res);
      }
    } catch (err) {
      logger.error(err);

      if (isObject(err) && !err.statusCode) {
        throw createError(500, err);
      }

      throw err;
    }

    return res;
  },

  loadData(data, meta = {}) {
    invariant(isObject(meta), 'Meta must be an object');

    const { url, statusCode, res, phantomPage } = meta;

    this.data = data;
    this.location = { href: url };
    this.valid = !!data;
    this.statusCode = statusCode || 200;
    this.res = res || null;
    this.phantomPage = phantomPage || null;

    // xhecks if the data is JSON
    // if the data is JSON, parses the json in 'page.data'
    // otherwise, load the HTML with cheerio and expose it in 'page.$`
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

    // if a phantom page instance was provided, save the response object
    // once it arrives
    if (phantomPage) {
      phantomPage.onResourceReceived = (res) => {
        this.res = res;
        phantomPage.onResourceReceived = null;
      };
    }
  }
};

export default function createPage(url, data, phantomPage) {
  const page = Object.create(pageProto);
  page.loadData(url, data, phantomPage);
  return page;
}
