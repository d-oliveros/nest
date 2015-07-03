require('./test-env');

import Spider from '../lib/Spider';
import {EventEmitter} from 'events';

let should = require('chai').should(); // eslint-disable-line no-unused-vars
let expect = require('chai').expect;

describe('Spider', function() {
  this.timeout(15000); // 15 seconds
  let globalSpider;

  it('should emit an event', (done) => {
    let spider = new Spider();
    spider.on('test:event', done);
    spider.emit('test:event');
  });

  it('should add and emit events to an external emitter', (done) => {
    let spider = new Spider();
    let emitter = new EventEmitter();
    let completed = 0;

    spider.addEmitter(emitter);

    spider.emitters.should.contain(emitter);

    spider.once('test:event', () => completed++);
    emitter.once('test:event', () => completed++);
    spider.emit('test:event');

    setTimeout(() => {
      if (completed !== 2)
        return done(new Error('Emitter did not received event'));

      done();
    }, 100);

  });

  it('should remove external emitter', () => {
    let spider = new Spider();
    let emitter = new EventEmitter();

    spider.addEmitter(emitter);
    expect(spider.emitters).to.contain(emitter);

    spider.removeEmitter(emitter);
    expect(spider.emitters).to.not.contain(emitter);
    expect(spider.emitters.length).to.equal(0);
  });

  it('should open a page statically', (done) => {
    let spider = new Spider();

    spider.open('http://www.github.com', () => {
      spider.stop();
      done();
    });
  });

  it('should open a dynamic page with phantomJS', (done) => {
    globalSpider = new Spider();
    globalSpider.open('http://www.google.com', true, done);
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

  it('should stop', (done) => {
    let spider = new Spider();

    spider.open('http://www.github.com', () => {
      spider.stop();

      if (spider.phantom)
        return done(new Error('Phantom was not cleared'));

      done();
    });
  });
});
