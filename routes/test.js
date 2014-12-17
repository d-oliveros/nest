var _ = require('lodash');

var Operation = require(__database+'/Operation');
var Item   = require(__database+'/Item');

// Route tests
describe('Routes', function() {
	var domains = require('./index');

	this.timeout(300000); // 5 mins

	beforeEach( function(done) {
		Operation.remove(function(err) {
			if (err) return done(err);
			Item.remove(done);
		});
	});

	_.each(domains, function(domain) {
		_.each(domain, function(route, key) {
			var shouldCreateTest = (key !== 'name');
			var warnMessage;

			if (shouldCreateTest) {
				warnMessage = 'Hint: Write test query for '+route.name+' ;)';

				if (!route.test) {
					return console.warn(warnMessage);
				}

				createRouteTest(domain, route);
			}
		});
	});
});

function createRouteTest(domain, route) {
	var testParams = route.test;

	describe(route.name, function() {
		it('should scrape results and spawn operations', function(done) {
			var agent, togo;

			agent = route.start(testParams.query);
			togo = 0;

			if ( testParams.shouldSpawnOperations ) {
				togo++;
				agent.once('operations:created', function(operations) {
					if ( !operations.length ) {
						console.error(operations);

						return done( new Error(
							'New crawling operations were not spawned.'
						));
					}

					next();
				});
			}

			if ( testParams.shouldCreateItems ) {
				togo++;
				agent.once('scraped:page', function(results, operation) {
					if ( results.created <= 0 ) {
						console.error(results, operation);
						
						return done( new Error(
							'No results scraped from page.'
						));
					}

					next();
				});
			}

			function next() {
				togo--;
				if ( togo === 0 ) {
					agent.stop(true);
					done();
				}
			}
		});
	});
}
