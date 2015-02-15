process.env.NODE_ENV = 'test';
var should = require('chai').should(); // jshint ignore:line
var expect = require('chai').expect;
var Spider = require('../lib/spider');
var EventEmitter = require('events').EventEmitter;

describe('Spider', function() {
	this.timeout(15000); // 15 seconds
	var globalSpider;

	it('should emit an event', function(done) {
		var spider = new Spider();
		spider.on('test:event', done);
		spider.emit('test:event');
	});

	it('should add and emit events to an external emitter', function(done) {
		var spider = new Spider();
		var emitter = new EventEmitter();

		spider.addEmitter(emitter);
		spider.emitters.should.contain(emitter);

		var completed = 0;
		spider.once('test:event', function() {
			completed++;
			if (completed === 2) done();

			setTimeout( function() {
				if (completed !== 2) {
					done( new Error('Emitter did not received event') );
				}
			}, 100);
		});

		emitter.once('test:event', function() {
			completed++;
			if (completed === 2) done();
		});

		spider.emit('test:event');
	});

	it('should remove external emitter', function() {
		var spider = new Spider();
		var emitter = new EventEmitter();

		spider.addEmitter(emitter);
		spider.emitters.should.contain(emitter);

		spider.removeEmitter(emitter);
		spider.emitters.should.not.contain(emitter);
		spider.emitters.length.should.equal(0);
	});

	it('should open a phantomJS page', function(done) {
		globalSpider = new Spider();
		globalSpider.open('http://www.google.com', done);
	});

	it('should have a phantomJS instance', function() {
		expect(globalSpider.phantom).to.be.an('object');
	});

	it('should close a phantomJS instance', function() {
		globalSpider.stopPhantom();
		expect(globalSpider.phantom).to.equal(null);
	});

	it('should emit an error', function(done) {
		globalSpider.once('error', done.bind(this, null));
		globalSpider.error('Test error');
	});

	it('should open a page statically', function(done) {
		var spider = new Spider();

		spider.open('http://www.github.com', true, function() {
			spider.stop();
			done();
		});
	});

	it('should stop', function(done) {
		var spider = new Spider();

		spider.open('http://www.github.com', function() {
			spider.stop();
		});

		spider.on('spider:stop', function() {
			if (spider.phantom) {
				return done( new Error('Phantom was not cleared') );
			}

			done();
		});
	});
});
