var _ = require('lodash');
var async = require('async');

var Item  = require(__database+'/Item');

var debug = require('debug')('Agent:run');

module.exports = function operationRunner(operation) {
	var state, route, scraper, middleware,
		url, agent, _error, _isStopping;

	agent       = this;
	state       = operation.state;
	route       = operation.route;
	scraper     = route.scraper;
	middleware  = route.middleware;
	_error      = agent.error;
	_isStopping = false;

	agent.on('agent:stop', function() {
		_isStopping = true;
	});

	debug('Starting operation', operation);

	// Save the starting time of this operation
	if ( agent.iteration === 0 ) {
		operation.state.startedDate = operation.wasNew ? 
			operation.created : 
			Date.now();
	}

	agent.emit('operation:start', operation);

	// Check if this operation is actually finished
	if ( state.finished ) {
		_.defer(agent.emit.bind(agent, 'operation:finish', operation));
		return agent;
	}

	// Create the URL using the operation's parameters
	url = route.urlTemplate(operation);

	async.waterfall([
		function openURL(callback) {
			agent.open(url, callback);
		},
		function scrapePage(page, callback) {
			page.evaluate(scraper, function(scraped) {
				agent.emit('scraped:raw', scraped, operation);
				callback(null, scraped);
			});
		},
		function sanitize(scraped, callback) {
			var sanitized = agent.sanitizeScraped(scraped);
			callback(null, sanitized);
		},
		function executeMiddleware(scraped, callback) {
			middleware(scraped, callback);
		},
		function spawnOperations(scraped, callback) {
			if ( !scraped.operations ) {
				debug('No operations to spawn.');
				return callback(null, scraped);
			}

			debug('Spawning operations.');
			var operations = [];

			async.each(scraped.operations, function(params, cb) {
				var parts = params.routeName.split(':');

				// Ok, this sucks. (shouldn't be requiring a module inside a function)
				// but, we can't require the routes, or Route, because Route
				// depends on Agent. Anyone has a better idea?
				var targetRoute = require(__routes+'/'+parts[0]+'/'+parts[1]);

				targetRoute.initialize(params.query, function(err, operation) {
					if (err) return cb(err);
					
					operations.push(operation);
					cb();
				});
			}, function(err) {
				if (err) return callback(err);

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

			callback(null, scraped);
		},
		function saveItems(scraped, callback) {
			Item.eachUpsert(scraped.items, route, callback);
		},
		function saveOperation(results, callback) {
			agent.iteration++;
			operation.stats.pages++;
			operation.stats.items += results.created;

			agent.emit('scraped:page', results, operation);
			agent.stopPhantom();

			debug('Saving operation: ', operation);
			operation.save(callback);
		}
	], onFinish);

	function onFinish(err) {
		if (err) return agent.error(err);

		if ( _isStopping ) {
			agent.emit('operation:stopped', operation);
		}

		if ( _isStopping || state.finished ) {
			agent.emit('operation:finish', operation);
		} else {
			agent.emit('operation:next', operation);
			agent.run(operation);
		}
	}

	return agent;
};
