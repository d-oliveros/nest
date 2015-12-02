import './testenv';
import { EventEmitter } from 'events';
import { expect } from 'chai';
import { every } from 'lodash';
import { createSpider } from '../src/spider';

describe('Spider', function() {
  this.timeout(15000); // 15 seconds
  let globalSpider;

  // @todo Move these to the worker tests. Spiders are no longer emitters
  xit('should emit an event', (done) => {
    const spider = createSpider();
    spider.on('test:event', done);
    spider.emit('test:event');
  });

  xit('should add and emit events to an external emitter', (done) => {
    const spider = createSpider();
    const emitter = new EventEmitter();
    let completed = 0;

    spider.addEmitter(emitter);

    expect(spider.emitters.has(emitter)).to.equal(true);

    spider.once('test:event', () => completed++);
    emitter.once('test:event', () => completed++);

    spider.emit('test:event');

    setTimeout(() => {
      if (completed !== 2) {
        return done(new Error('Emitter did not received event'));
      }

      done();
    }, 100);

  });

  xit('should remove external emitter', () => {
    const spider = createSpider();
    const emitter = new EventEmitter();

    spider.addEmitter(emitter);
    expect(spider.emitters.has(emitter)).to.equal(true);

    spider.removeEmitter(emitter);
    expect(spider.emitters.has(emitter)).to.equal(false);
    expect(spider.emitters.size).to.equal(0);
  });

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

    const scraped = await spider.scrape(url, { scraper($) {
      const titles = $('.title a').map((i, node) => $(node).text()).get();

      const items = titles.map((title) => {
        return {
          key: title
        };
      });

      return { items };
    }});

    expect(scraped).to.be.an('object');
    expect(scraped.actions).to.be.an('array').of.length(0);
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
