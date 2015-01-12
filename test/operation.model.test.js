process.env.NODE_ENV = 'test';

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

			keyParams.route.should.equal(dummyParams.route);
			keyParams.query.should.equal(dummyParams.query);
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
