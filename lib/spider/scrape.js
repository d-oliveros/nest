var _ = require('lodash');
var async = require('async');

var Item  = require('../models/Item');
var modules = require('../modules');
var _log = require('../logger');

var routes = require('../../routes');
var debug = _log.debug('Spider:scrape');

// Exports: Scraper function
//
module.exports = scrape;


// runs an operation. `this` should be a `Spider` instance.
function scrape(operation) {
	var state, route, url, spider, routeName, provider, _isBlocked;

	spider      = this;
	state       = operation.state;

	routeName   = operation.route;
	provider    = operation.provider;
	route       = routes[provider][routeName];

	_isBlocked  = false;

	debug('Starting operation: '+operation.routeId+
		(operation.query ? ' '+operation.query : ''));

	// save the starting time of this operation
	if ( spider.iteration === 0 ) {
		operation.state.startedDate = operation.wasNew ? 
			operation.created : 
			Date.now();
	}

	// create the URL using the operation's parameters
	url = route.urlTemplate(operation);

	spider.emit('operation:start', operation, url);

	// check if this operation is actually finished
	if ( state.finished ) {
		_.defer(spider.emit.bind(spider, 'operation:finish', operation));
		return spider;
	}

	async.waterfall([
		function openURL(callback) {
			spider.open(url, route.isDynamic, callback);
		},
		function checkStatus(page, callback) {
			page.evaluate(route.checkStatus, function(status) {
				switch (status) {
					case 'blocked':
						_isBlocked = true;
						onFinish();
						break;

					default:
					case 'ok': 
						callback(null, page);
				}
			});
		},
		function scrapePage(page, callback) {
			page.evaluate(route.scraper, function(scraped) {
				spider.emit('scraped:raw', scraped, operation);
				callback(null, scraped);
			});
		},
		function sanitize(scraped, callback) {
			var sanitized = spider.sanitizeScraped(scraped);
			callback(null, sanitized);
		},
		function setItemsMeta(scraped, callback) {
			_.each(scraped.items, function(item) {
				item.provider    = provider;
				item.route       = routeName;
				item.routeWeight = route.priority;
			});
			
			callback(null, scraped);
		},
		function runMiddleware(scraped, callback) {

			// route-specific middleware
			route.middleware(scraped, callback);

		},
		function runModules(scraped, callback) {

			// apply the modules to this scraped data
			async.eachSeries(_.toArray(modules), function(module, cb) {
				module(scraped, cb);
			}, function(err) {
				if (err) return callback(err);
				return callback(null, scraped);
			});
		},
		function spawnOperations(scraped, callback) {
			if ( scraped.operations.length === 0 ) {
				debug('No operations to spawn.');
				return callback(null, scraped);
			}

			debug('Spawning operations.');
			var operations = [];

			async.each(scraped.operations, function(params, cb) {
				var targetRouteId = params.provider+':'+params.route;
				var targetRoute = routes[params.provider][params.route];

				if ( !targetRoute ) {
					debug(
						'Warning: '+operation.routeId+' '+
						'wanted to scrape '+targetRouteId+', '+
						'but that route does not exists');
					return cb();
				}

				targetRoute.initialize(params.query, function(err, operation) {
					if (err) return cb(err);
					
					operations.push(operation);
					cb();
				});
			}, function(err) {
				if (err) return callback(err);

				operation.stats.spawned += operations.length;

				debug('Operations spawned: '+operations.length+' operations.');
				spider.emit('operations:created', operations);

				return callback(null, scraped);
			});
		},
		function setOperationState(scraped, callback) {

			if ( scraped.hasNextPage )
				state.currentPage++;
			
			else {
				state.finished = true;
				state.finishedDate = Date.now();
			}

			if ( scraped.state ) {
				state.data = state.data || {};
				_.assign(state.data, scraped.state);
			}

			state.lastLink = url;

			callback(null, scraped);
		},
		function saveItems(scraped, callback) {
			Item.eachUpsert(scraped.items, callback);
		},
		function saveOperation(results, callback) {
			spider.iteration++;
			operation.stats.pages++;
			operation.stats.items   += results.created;
			operation.stats.updated += results.updated;

			spider.emit('scraped:page', results, operation);
			spider.stopPhantom();

			debug('Saving operation.');
			operation.save(callback);
		}
	], onFinish);

	function onFinish(err) {
		if (err) return spider.error(err);

		// if the operation has been stopped
		if ( !spider.running )
			spider.emit('operation:stopped', operation);

		// if the operation has finished
		if ( !spider.running || state.finished )
			spider.emit('operation:finish', operation);

		// if the IP has been blocked
		else if ( _isBlocked ) {
			debug('Operation blocked. Retrying in 5s...');
			spider.emit('operation:blocked', operation, url);

			setTimeout(spider.scrape.bind(spider, operation), 5000);
		} 

		// if the operation has not finished
		else {
			spider.emit('operation:next', operation);
			spider.scrape(operation);
		}
	}
}
