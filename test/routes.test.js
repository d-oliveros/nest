process.env.NODE_ENV = 'test';

var _ = require('lodash');

var Operation = require('../framework/models/Operation');
var Item      = require('../framework/models/Item');

describe('Routes', function() {
	this.timeout(300000); // 5 mins

	beforeEach( function(done) {
		Operation.remove(function(err) {
			if (err) return done(err);
			Item.remove(done);
		});
	});

	var domains = require('../routes');
	
	_.each(domains, function(domain) {
		_.each(domain, function(route) {
			if (!route.test)
				console.warn('Hint: Write test for '+route.provider+'->'+route.name+' ;)');

			else 
				createRouteTest(domain, route);
		});
	});
});

function createRouteTest(domain, route) {
	var testParams = route.test;

	describe(route.name, function() {
		var responsabilities = [];

		if ( testParams.shouldSpawnOperations ) {
			responsabilities.push('spawn operations');
		}

		if ( testParams.shouldCreateItems ) {
			responsabilities.push('scrape results');
		}

		it('should '+responsabilities.join(' and '), function(done) {
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
