import cheerio from 'cheerio';
import { isString } from 'lodash';

export default class Page {
  constructor(url, data) {
    this.data = data;
    this.isJSON = false;
    this.location = {
      href: url
    };

    try {
      this.data = JSON.parse(this.data);
      this.isJSON = true;
    } catch (err) {
      if (data && isString(data)) {
        this.html = data;
        this.$ = cheerio.load(data);
      }
    }
  }
}
