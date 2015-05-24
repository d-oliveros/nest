import cheerio from 'cheerio';

export default class Page {
  constructor(url, html) {
    this.html = html;
    this.location = {
      href: url
    };
  }
  evaluate(func, callback) {
    let $ = cheerio.load(this.html);
    callback(func.call(this, $, this.html));
  }
}
