process.env.NODE_ENV = 'test';

var should = require('chai').should(); // jshint ignore:line
var Operation = require('../lib/models/Operation');
var dummyParams = require('./data/params.json');

describe('Operation', function() {
	this.timeout(300000); // 5 mins

	describe('Statics', function() {

		before( function(done) {
			Operation.remove(done);
		});

		it('should get the key params', function() {
			var keyParams = Operation.getKeyParams(dummyParams);

			var provider = dummyParams.provider;
			var route    = dummyParams.route;
			var query    = dummyParams.query;
			var routeId  = provider+':'+route;

			keyParams.route.should.equal(route);
			keyParams.query.should.equal(query);
			keyParams.provider.should.equal(provider);
			keyParams.routeId.should.equal(routeId);
		});

		it('should create a new operation', function(done) {
			var keyParams = Operation.getKeyParams(dummyParams);
			
			Operation.remove(keyParams, function(err) {
				if (err) return done(err);
				Operation.findOrCreate(keyParams, function(err, operation) {
					if (!operation.wasNew) {
						return done( new Error('Operation is not new') );
					}
					done();
				});
			});
		});
	});

});
