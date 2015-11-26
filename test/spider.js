import './testenv';
import Spider from '../src/Spider';
import { EventEmitter } from 'events';

const should = require('chai').should(); // eslint-disable-line no-unused-vars
const expect = require('chai').expect;

describe('Spider', function() {
  this.timeout(15000); // 15 seconds
  let globalSpider;

  it('should emit an event', (done) => {
    const spider = new Spider();
    spider.on('test:event', done);
    spider.emit('test:event');
  });

  it('should add and emit events to an external emitter', (done) => {
    const spider = new Spider();
    const emitter = new EventEmitter();
    let completed = 0;

    spider.addEmitter(emitter);

    spider.emitters.should.contain(emitter);

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

  it('should remove external emitter', () => {
    const spider = new Spider();
    const emitter = new EventEmitter();

    spider.addEmitter(emitter);
    expect(spider.emitters).to.contain(emitter);

    spider.removeEmitter(emitter);
    expect(spider.emitters).to.not.contain(emitter);
    expect(spider.emitters.length).to.equal(0);
  });

  it('should open a page statically', async () => {
    const spider = new Spider();

    const page = await spider.open('http://www.github.com');
    expect(page.html).to.be.a('string');
    expect(page.html.length).to.be.gt(0);
    spider.stop();
  });

  it('should open a dynamic page with phantomJS', async () => {
    globalSpider = new Spider();
    await globalSpider.open('http://www.google.com', { dynamic: true });
  });

  it('should have a phantomJS instance', () => {
    expect(globalSpider.phantom).to.be.an('object');
  });

  it('should close a phantomJS instance', () => {
    globalSpider.stopPhantom();
    expect(globalSpider.phantom).to.equal(null);
  });

  it('should emit an error', (done) => {
    globalSpider.once('error', () => done());
    globalSpider.error('Test error');
  });

  it('should stop', async () => {
    const spider = new Spider();

    await spider.open('http://www.github.com');
    spider.stop();

    if (spider.phantom) {
      throw new Error('Phantom was not cleared');
    }
  });
});
