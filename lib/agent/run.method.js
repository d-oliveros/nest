var _ = require('lodash');
var async = require('async');

var Item  = require('../models/Item');
var modules = require('../modules');
var _log = require('../logger');

var routes = require('../../routes');
var debug = _log.debug('Agent:run');

// Exports: Operation runner function
//
module.exports = runner;


// runs an operation. `this` should be an `Agent` instance.
function runner(operation) {
	var state, route, url, agent, routeName, provider, _isStopping, _isBlocked;

	agent       = this;
	state       = operation.state;

	routeName   = operation.route;
	provider    = operation.provider;
	route       = routes[provider][routeName];

	_isStopping = false;
	_isBlocked  = false;

	agent.on('agent:stop', function() {
		_isStopping = true;
	});

	debug('Starting operation: '+operation.routeId+' '+operation.query);

	// save the starting time of this operation
	if ( agent.iteration === 0 ) {
		operation.state.startedDate = operation.wasNew ? 
			operation.created : 
			Date.now();
	}

	// create the URL using the operation's parameters
	url = route.urlTemplate(operation);

	agent.emit('operation:start', operation, url);

	// check if this operation is actually finished
	if ( state.finished ) {
		_.defer(agent.emit.bind(agent, 'operation:finish', operation));
		return agent;
	}

	async.waterfall([
		function openURL(callback) {
			agent.open(url, callback);
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
				agent.emit('scraped:raw', scraped, operation);
				callback(null, scraped);
			});
		},
		function sanitize(scraped, callback) {
			var sanitized = agent.sanitizeScraped(scraped);
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
				var targetRoute = routes[params.provider][params.route];

				targetRoute.initialize(params.query, function(err, operation) {
					if (err) return cb(err);
					
					operations.push(operation);
					cb();
				});
			}, function(err) {
				if (err) return callback(err);

				operation.stats.spawned += operations.length;

				debug('Operations spawned: '+operations.length+' operations.');
				agent.emit('operations:created', operations);

				return callback(null, scraped);
			});
		},
		function setOperationState(scraped, callback) {

			if ( scraped.hasNextPage ) {
				state.currentPage++;
			} else {
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
			agent.iteration++;
			operation.stats.pages++;
			operation.stats.items   += results.created;
			operation.stats.updated += results.updated;

			agent.emit('scraped:page', results, operation);
			agent.stopPhantom();

			debug('Saving operation.');
			operation.save(callback);
		}
	], onFinish);

	function onFinish(err) {
		if (err) return agent.error(err);

		// if the operation has been stopped
		if ( _isStopping ) {
			agent.emit('operation:stopped', operation);
		}

		// if the operation has finished
		if ( _isStopping || state.finished ) {
			agent.emit('operation:finish', operation);
		}

		// if the IP has been blocked
		else if ( _isBlocked ) {
			debug('Operation blocked. Retrying in 5s...');
			agent.emit('operation:blocked', operation, url);

			setTimeout(agent.run.bind(agent, operation), 5000);
		} 

		// if the operation has not finished
		else {
			agent.emit('operation:next', operation);
			agent.run(operation);
		}
	}
}
