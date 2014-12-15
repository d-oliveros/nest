var _ = require('lodash');

// Worker objects being executed right now
exports.workers = [];

exports.externalOperationIds = [];

exports.getOperationIds = function() {
	var workerOperationIds = _.compact( _.pluck(exports.workers, 'operationId') );
	return _.union(exports.externalOperationsIds, workerOperationIds);
};
