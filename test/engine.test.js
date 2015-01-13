process.env.NODE_ENV = 'test';
var should = require('chai').should(); // jshint ignore:line
var Operation = require('../lib/models/Operation');
var Item = require('../lib/models/Item');
var engine = require('../lib/engine');
var config = require('../config');

var dummyParams = require('./data/params.json');

describe('engine', function() {
	this.timeout(15000); // 15 seconds

	describe('workers', function() {

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

		it('should start with '+config.engine.workers+' workers', function() {
			engine.state.workers.length.should.equal(config.engine.workers);
		});

		it('should pick up an operation after one second', function(done) {
			engine.emitter.once('operation:start', done.bind(this, null));
			
			setTimeout( function() {
				Operation.findOrCreate(dummyParams, function(err) {
					if (err) return done(err);
				});
			}, 1000);
		});

		// it should stop the engine
		after( function(done) {
			engine.stop( function(err) {
				if (err) return done(err);

				if ( engine.state.workers.length > 0 ) {
					return done( new Error('Engine did not removed workers.') );
				}

				done();
			});
		});
	});

	describe('concurrency', function() {

		// Clear the database
		beforeEach( function(done) {
			Operation.remove( function(err) {
				if (err) return done(err);
				Item.remove( function(err) {
					if (err) return done(err);
					engine.start();
					done();
				});
			});
		});

		it('should respect the concurrency limit of routes', function(done) {
			var workers = config.engine.workers;

			if ( workers < 2 ) 
				return done('This test requires at least 2 engine workers.');

			var githubSearchRoute = require('../routes/github/search');
			var runningGithubSearchRoutes = 0;
			var runningWorkers = 0;
			var finished = false;

			var checkOperation = function(operation) {
				var provider = operation.provider;
				var routeName = operation.route;

				runningWorkers++;

				if ( provider === 'github' && routeName === 'search') {
					runningGithubSearchRoutes++;
				}

				check();
			};

			var onNoop = function() {
				runningWorkers = workers;
				check();
			};

			// hard-set the concurrency limit
			githubSearchRoute.concurrency = 1;

			// initialize two search routes
			githubSearchRoute.start(githubSearchRoute.test.query);
			githubSearchRoute.start(githubSearchRoute.test.query+'test');

			// when an operation starts, this event is emitted
			engine.emitter.on('operation:start', checkOperation);

			// when there are no pending operations, this event is emitted
			engine.emitter.once('operation:noop', onNoop);

			function check() {
				if ( runningWorkers < workers || finished ) return;

				finished = true;

				if ( runningGithubSearchRoutes > 1 ) {
					return done( new Error('Went over concurrency limit.') );
				}

				engine.emitter.removeListener('operation:start', checkOperation);
				engine.emitter.removeListener('operation:noop', onNoop);

				done();
			}
		});

		// it should stop the engine
		after( function(done) {
			engine.stop( function(err) {
				if (err) return done(err);

				if ( engine.state.workers.length > 0 ) {
					return done( new Error('Engine did not removed workers.') );
				}

				done();
			});
		});
	});

});
