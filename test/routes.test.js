process.env.NODE_ENV = 'test';

var _ = require('lodash');

var Route      = require('../lib/route');
var Item       = require('../lib/models/Item');
var Operation  = require('../lib/models/Operation');

var testRoute  = process.env.TEST_ROUTE || false;
var testDomain = process.env.TEST_DOMAIN || false;

describe('Routes', function() {
	this.timeout(15000); // 15 secs

	beforeEach( function(done) {
		Operation.remove(function(err) {
			if (err) return done(err);
			Item.remove(done);
		});
	});

	var domains = require('../routes');
	
	_.each(domains, function(domain, domainName) {
		
		if ( testDomain && testDomain !== domainName )
			return;

		describe(domainName, function() {

			_.each(domain, function(route, routeName) {
				var routeId = domainName+':'+routeName;
				var shouldTest = !testRoute || testRoute === routeId;

				if ( !(route instanceof Route) || !shouldTest ) 
					return;

				if ( !route.test )
					console.warn('Hint: Enable test for '+route.provider+':'+route.name+' ;)');

				else 
					createRouteTest(domain, route);
			});
		});
	});
});

function createRouteTest(domain, route) {
	var testParams = route.test;

	describe(route.name, function() {

		before( function(done) {
			Item.remove(done);
		});

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
