import cheerio from 'cheerio';
import createError from 'http-errors';
import { isString, isObject, isFunction } from 'lodash';
import assert from 'assert';
import logger from './logger';

/**
 * Creates a new page.
 *
 * @param  {String}  data  The page's content. Can be HTML, JSON, etc.
 * @param  {Object}  meta  Extra properties to add to the page.
 * @return {Object}        A new page instance.
 */
export default function createPage(data, meta) {
  const page = Object.assign(Object.create(pageProto), {
    data: null,
    location: null,
    isJSON: false,
    valid: false,
    html: null,
    phantomPage: null,
    statusCode: null,
    res: null,
    $: null,
  });

  page.loadData(data, meta);

  return page;
}

const pageProto = {

  /**
   * Runs the provided function in the page's context;
   *
   * @param  {Function}  func  Function to apply in this page's context.
   * @param  {Boolean}   inPhantomPage  Should func be called from within the PhantomJS page?
   * @return {Mixed}     Returns the value returned from 'func'
   */
  async runInContext(func, inPhantomPage) {
    assert(isFunction(func), 'function to run in context is not a function');
    let res;

    if (inPhantomPage && !this.phantomPage) {
      logger.warn('[Page]: Tried to apply fn to static page');
    }

    try {
      if (inPhantomPage && this.phantomPage) {
        res = await this.phantomPage.evaluateAsync(func);
      }
      else {
        res = await func.call(this, this.isJSON ? this.data : this.$, this);
      }
    }
    catch (err) {
      logger.error(err);
      if (isObject(err) && !err.statusCode) {
        throw createError(500, err);
      }
      throw err;
    }

    return res;
  },

  /**
   * Initializes this page with the provided properties.
   *
   * @param  {String}  data  The page's content. Can be HTML, JSON, etc.
   * @param  {Object}  meta  Extra properties to add to the page.
   * @return {undefined}
   */
  loadData(data, meta = {}) {
    assert(isObject(meta), 'Meta must be an object');

    const { url, statusCode, res, phantomPage } = meta;

    this.data = data;
    this.location = { href: url };
    this.valid = !!data;
    this.statusCode = statusCode || 200;
    this.res = res || null;
    this.phantomPage = phantomPage || null;

    // checks if the data is JSON.
    // if the data is JSON, parses the json in 'page.data'.
    // otherwise, load the HTML with cheerio and expose it in 'page.$`.
    try {
      this.data = JSON.parse(data);
      this.isJSON = true;
    }
    catch (err) {
      if (data && isString(data)) {
        this.html = data;
        this.$ = cheerio.load(data);
      }
      else {
        logger.warn(`[page]: Data is not valid: ${JSON.stringify(data)}`);
        this.valid = false;
      }
    }

    // if a phantom page instance was provided, save the response object once it arrives.
    if (phantomPage) {
      phantomPage.property('onResourceReceived', (res) => {
        this.res = res;
        phantomPage.property('onResourceReceived', null);
      });
    }
  },
};
