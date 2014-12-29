var Operation = require(__framework+'/models/Operation');
var Item = require(__framework+'/models/Item');
var engine = require('./index');

var dummyParams = require(__test+'/data/params.json');

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
		engine.state.getOperationIds().length.should.equal(0);
	});

	it('should start an operation after one second', function(done) {
		engine.emitter.once('operation:start', done.bind(this, null));
		
		setTimeout( function() {
			var keyParams = Operation.getKeyParams(dummyParams);
			Operation.findOrCreate(keyParams, function(err) {
				if (err) return done(err);
			});
		}, 600);
	});
});
