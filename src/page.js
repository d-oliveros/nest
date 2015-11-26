import cheerio from 'cheerio';
import inspect from 'util-inspect';
import { isString, isObject, isFunction } from 'lodash';
import logger from './logger';

export default function createPage(url, data) {
  const page = {
    data: data,
    location: { href: url },
    isJSON: false,
    valid: true,
    html: null,
    $: null
  };

  // Checks if the data is JSON
  // If the data is JSON, parses the json in 'page.data'
  // Otherwise, load the HTML with cheerio and expose it in 'page.$`
  try {
    page.data = JSON.parse(page.data);
    page.isJSON = true;
  } catch (err) {
    if (data && isString(data)) {
      page.html = data;
      page.$ = cheerio.load(data);
    } else {
      logger.warn(`[createPage]: Data is not valid: ${inspect(data)}`);
      page.valid = false;
    }
  }

  // Applies `func` to this page
  page.apply = (func) => {
    let res;

    try {
      res = func.call(page, page.isJSON ? page.data : page.$);

      // Convert sync functions to promises
      if (!isObject(res) || !isFunction(res.then)) {
        res = Promise.resolve(res);
      }
    } catch (err) {
      logger.error(err);
      return Promise.reject(err);
    }

    return res;
  };

  return page;
}
