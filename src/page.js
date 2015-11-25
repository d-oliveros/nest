import cheerio from 'cheerio';
import inspect from 'util-inspect';
import { isString } from 'lodash';
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

  return page;
}
