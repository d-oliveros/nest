process.env.NODE_ENV = 'test';
var should = require('chai').should(); // jshint ignore:line
var expect = require('chai').expect;
var Agent = require('../framework/agent');
var EventEmitter = require('events').EventEmitter;

describe('Agent', function() {
	this.timeout(15000); // 15 seconds
	var globalAgent;

	it('should emit an event', function(done) {
		var agent = new Agent();
		agent.on('test:event', done);
		agent.emit('test:event');
	});

	it('should add and emit events to an external emitter', function(done) {
		var agent = new Agent();
		var emitter = new EventEmitter();

		agent.addEmitter(emitter);
		agent.emitters.should.contain(emitter);

		var completed = 0;
		agent.once('test:event', function() {
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

		agent.emit('test:event');
	});

	it('should remove external emitter', function() {
		var agent = new Agent();
		var emitter = new EventEmitter();

		agent.addEmitter(emitter);
		agent.emitters.should.contain(emitter);

		agent.removeEmitter(emitter);
		agent.emitters.should.not.contain(emitter);
		agent.emitters.length.should.equal(0);
	});

	it('should open a phantomJS page', function(done) {
		globalAgent = new Agent();
		globalAgent.open('http://www.google.com', done);
	});

	it('should have a phantomJS instance', function() {
		expect(globalAgent.phantom).to.be.an('object');
	});

	it('should close a phantomJS instance', function() {
		globalAgent.stopPhantom();
		expect(globalAgent.phantom).to.equal(null);
	});

	it('should emit an error', function(done) {
		globalAgent.once('error', done.bind(this, null));
		globalAgent.error('Test error');
	});

	it('should stop', function(done) {
		var agent = new Agent();

		agent.open('http://www.github.com', function() {
			agent.stop();
		});

		agent.on('agent:stop', function() {
			if (agent.phantom) {
				return done( new Error('Phantom was not cleared') );
			}

			done();
		});
	});
});
