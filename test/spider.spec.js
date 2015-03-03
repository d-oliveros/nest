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
		var completed = 0;

		function addOne() {
			completed++;
		}

		spider.addEmitter(emitter);

		spider.emitters.should.contain(emitter);

		spider.once('test:event', addOne);
		emitter.once('test:event', addOne);
		spider.emit('test:event');

		setTimeout( function() {
			if (completed !== 2)
				return done( new Error('Emitter did not received event') );

			done();
		}, 100);

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

	it('should open a page statically', function(done) {
		var spider = new Spider();

		spider.open('http://www.github.com', function() {
			spider.stop();
			done();
		});
	});
	
	it('should open a dynamic page with phantomJS', function(done) {
		globalSpider = new Spider();
		globalSpider.open('http://www.google.com', true, done);
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

	it('should stop', function(done) {
		var spider = new Spider();

		spider.open('http://www.github.com', function() {
			spider.stop();

			if (spider.phantom)
				return done( new Error('Phantom was not cleared') );
			
			done();
		});
	});
});
