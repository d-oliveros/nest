var Operation = require('./index');
var dummyParams = require(__test+'/data/params.json');

describe('Operation', function() {
	this.timeout(300000); // 5 mins

	describe('Virtuals', function() {

		before( function(done) {
			var keyParams = Operation.getKeyParams(dummyParams);
			Operation.create(keyParams, done);
		});

		it('should get the correct route', function(done) {
			var keyParams, domainIsObject, domainNameIsIncorrect, 
				routeIsObject, routeIsCorrect;

			keyParams = Operation.getKeyParams(dummyParams);
			
			Operation.findOne(keyParams, function(err, operation) {
				
				domainIsObject = typeof operation.routeDomain === 'object';
				domainNameIsIncorrect = operation.routeDomain.name !== 'github';

				if ( !domainIsObject || domainNameIsIncorrect ) {
					return done( new Error('Domain is incorrect: '+
						JSON.stringify(operation.domainName)
					));
				}

				routeIsObject  = typeof operation.route === 'object';
				routeIsCorrect = operation.route.name === dummyParams.routeName;

				if ( !routeIsObject || !routeIsCorrect ) {
					return done( new Error('Route is incorrect:' +
						dummyParams.routeName
					));
				}

				done();
			});
		});
	});

	describe('Statics', function() {

		before( function(done) {
			Operation.remove(done);
		});

		it('should get the key params', function() {
			var keyParams = Operation.getKeyParams(dummyParams);

			keyParams.routeName.should.equal(dummyParams.routeName);
			keyParams.query.should.equal(dummyParams.query);
		});

		it('should create a new operation', function(done) {
			var keyParams = Operation.getKeyParams(dummyParams);
			
			Operation.remove(keyParams, function(err) {
				if (err) return done(err);
				Operation.findOrCreate(keyParams, function(err, operation) {
					operation.wasNew.should.equal(true);
					if (!operation.wasNew) {
						return done( new Error('Operation is not new') );
					}
					done();
				});
			});
		});
	});

});
