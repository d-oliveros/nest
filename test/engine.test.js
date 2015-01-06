process.env.NODE_ENV = 'test';
var should = require('chai').should(); // jshint ignore:line
var Operation = require('../framework/models/Operation');
var Item = require('../framework/models/Item');
var engine = require('../framework/engine');

var dummyParams = require('./data/params.json');

describe('engine', function() {
	this.timeout(15000); // 15 seconds

	// Clear the database
	before( function(done) {
		Operation.remove( function(err) {
			if (err) return done(err);
			Item.remove( function(err) {
				if (err) return done(err);
				engine.start();
				done();
			});
		});
	});

	it('should start with 0 operations', function() {
		engine.state.operationIds.length.should.equal(0);
	});

	it('should pick up an operation after one second', function(done) {
		engine.emitter.once('operation:start', done.bind(this, null));
		
		setTimeout( function() {
			var keyParams = Operation.getKeyParams(dummyParams);
			Operation.findOrCreate(keyParams, function(err) {
				if (err) return done(err);
			});
		}, 1000);
	});
});
