import { isObject, isFunction } from 'lodash';
import cheerio from 'cheerio';
import createError from 'http-errors';
import assert from 'assert';

import logger from './logger';

/**
 * Checks if the passed argument is a JSON string.
 *
 * @param  {} body [description]
 * @return {[type]}      [description]
 */
const checkIsJson = (body) => {
  try {
    assert(typeof body === 'string');
    JSON.parse(body);
    return true;
  }
  catch (error) {
    return false;
  }
};

/**
 * Creates a new page.
 *
 * @param  {String}  data  The page's content. Can be HTML, JSON, etc.
 * @param  {Object}  meta  Extra properties to add to the page.
 * @return {Object}        A new page instance.
 */
export default function createPage(pageData) {
  assert(pageData && isObject(pageData), 'Meta must be an object');

  const isJson = checkIsJson(pageData.content);
  const parsedJson = isJson ? JSON.parse(pageData.content) : undefined;

  const page = Object.assign(Object.create(pageProto), {
    data: isJson ? parsedJson : pageData.content,
    valid: !!pageData.content,
    location: {
      href: pageData.url,
    },
    isJson: isJson,
    html: isJson ? undefined : pageData.content,
    browserPage: pageData.browserPage,
    statusCode: pageData.statusCode || -1,
    pageLoadRes: pageData.pageLoadRes,
    $: isJson ? undefined : cheerio.load(pageData.content),
  });

  return page;
}

const pageProto = {

  /**
   * Runs the provided function in the page's context;
   *
   * @param  {Function}  func       Function to apply in this page's context.
   * @param  {Boolean}   inBrowser  Should func be called from within the Puppeteer page?
   * @return {Mixed}                Returns the value returned from 'func'
   */
  async runInContext(func, inBrowser) {
    assert(isFunction(func), 'function to run in context is not a function');
    let res;

    if (inBrowser && !this.browserPage) {
      logger.warn('[Page]: Tried to apply fn to static page');
    }

    try {
      if (inBrowser && this.browserPage) {
        res = await this.browserPage.evaluateAsync(func);
      }
      else {
        res = await func.call(this, (this.isJson ? this.data : this.$), this);
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
};
