var Operation = require(__models+'/Operation');
var Profile = require(__models+'/Profile');
var engine = require('./index');

var dummyParams = require(__test+'/data/dummy/params.json');

describe('engine', function() {
	this.timeout(15000); // 15 seconds

	before( function(done) {
		Operation.remove( function(err) {
			if (err) return done(err);
			Profile.remove( function(err) {
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
