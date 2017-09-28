import { expect } from 'chai';
import { every } from 'lodash';

import './testenv';

import { createSpider } from '../src/spider';
import mockRoute from './mocks/route';


describe('Spider', function SpiderUnitTestSuite() {
  this.timeout(15000); // 15 seconds
  let globalSpider;

  it('should open a page statically', async () => {
    const spider = createSpider();

    const page = await spider.open('http://www.github.com');
    expect(page.html).to.be.a('string');
    expect(page.html.length).to.be.gt(0);
    spider.stop();
  });

  it('should open a dynamic page with phantomJS', async () => {
    globalSpider = createSpider();
    await globalSpider.open('http://www.google.com', { dynamic: true });
  });

  it('should have a phantomJS instance', () => {
    expect(globalSpider.phantom).to.be.an('object');
  });

  it('should close a phantomJS instance', () => {
    globalSpider.stopPhantom();
    expect(globalSpider.phantom).to.equal(null);
  });

  it('should scrape hackernews', async () => {
    const spider = createSpider();
    const url = 'https://news.ycombinator.com';

    const scraper = ($) => {
      const titles = $('.title a').map((i, node) => $(node).text()).get();
      const items = titles.map((title) => ({ key: title }));
      return { items };
    };

    const scraped = await spider.scrape(url, { scraper });

    expect(scraped).to.be.an('object');
    expect(scraped.jobs).to.be.an('array').of.length(0);
    expect(scraped.items).to.be.an('array');

    expect(scraped.items.length).to.be.greaterThan(20);
    expect(every(scraped.items, (i) => i.key)).to.equal(true);
  });

  it('should scrape hackernews with a route definition', async () => {
    const spider = createSpider();
    const url = mockRoute.getUrl();

    const scraped = await spider.scrape(url, mockRoute);

    expect(scraped).to.be.an('object');
    expect(scraped.jobs).to.be.an('array').of.length(0);
    expect(scraped.items).to.be.an('array');

    expect(scraped.items.length).to.be.greaterThan(20);
    expect(every(scraped.items, (i) => i.key)).to.equal(true);
  });

  it('should stop', async () => {
    const spider = createSpider();

    await spider.open('http://www.github.com');
    spider.stop();

    if (spider.phantom) {
      throw new Error('Phantom was not cleared');
    }
  });
});
