var _ = require('lodash');
var _log = require('../../logger');
var debug = _log.debug('Operation:statics');

exports.getKeyParams = function(params) {
	if ( !params.route )
		throw new Error('Route is required.');

	if ( !params.provider )
		throw new Error('Provider is required.');

	var route = params.route;
	var provider = params.provider;

	var keyParams = {
		route: route,
		provider: provider,
		routeId: provider+':'+route,
	};

	if ( params.query ) {
		keyParams.query = params.query;
	}

	debug('Generated key params', keyParams);

	return keyParams;
};

exports.findOrCreate = function(params, callback) {
	var Operation, keyParams;

	Operation = this;
	keyParams = Operation.getKeyParams(params);
	params.routeId = keyParams.routeId;

	debug('findOrCreate with params', keyParams);

	Operation.findOne(keyParams, function(err, operation) {
		if (err) return callback(err);
		if (!operation) {
			debug('Creating operation with params', params);
			Operation.create(params, function(err, operation) {
				if (err) return callback(err);
				operation.wasNew = true;
				callback(null, operation);
			});
		}
		else {
			operation.wasNew = false;
			callback(null, operation);
		}
	});
};

exports.getNext = function(state, callback) {
	var runningOperations = state.operationIds;
	var disabledRoutes = [];
	var runningRoutes = {};

	var query = { 
		'state.finished': false
	};

	// disables routes if the concurrency treshold is met
	_.each(state.workers, function(worker) {
		if ( !worker.route ) return;
		var routeId = worker.route.provider+':'+worker.route.name;
		runningRoutes[routeId] = runningRoutes[routeId] || 0;
		runningRoutes[routeId]++;

		if ( runningRoutes[routeId] === worker.route.concurrency ) {
			disabledRoutes.push(routeId);
		}
	});

	if ( runningOperations.length )
		query._id = { $nin: runningOperations };

	if ( disabledRoutes.length )
		query.routeId = { $nin: disabledRoutes };

	this
		.findOne(query)
		.sort({ 'priority': -1 })
		.exec(callback);
};
