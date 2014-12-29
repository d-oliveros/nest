var debug = require('debug')('Operation:statics');

exports.getKeyParams = function(params) {
	if ( !params.route )
		throw new Error('Route is required.');

	if ( !params.provider )
		throw new Error('Provider is required.');

	var keyParams = {
		route: params.route,
		provider: params.provider,
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
	var query, runningOperations, disabledRoutes;

	runningOperations = state.operationIds;
	disabledRoutes    = __config.engine.disabledRoutes || [];

	query = { 
		'state.finished': false
	};

	if ( runningOperations.length )
		query._id = { $nin: runningOperations };

	if ( disabledRoutes.length )
		query.route = { $nin: disabledRoutes };

	this
		.findOne(query)
		.sort({ 'priority': -1 })
		.exec(callback);
};
