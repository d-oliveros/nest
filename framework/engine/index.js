var _ = require('lodash');

var Worker = require('./Worker');
var state = require('./state');

exports.emitter = require('./emitter');
exports.state = state;

exports.start = function() {
	var self = this;

	_.times(__config.engine.workers, function() {
		var worker = new Worker();
		worker.addEmitter(self.emitter);
		state.workers.push(worker);
	});

	/*
	Uncomment this to test if workers are trying to work on the same operation
	setInterval( function() {
		var errorMessage, workerOperationIds;

		workerOperationIds = state.getOperationIds();

		if (workerOperationIds.length !== _.unique(workerOperationIds).length) {
			errorMessage = 'Two workers are working on the same operation ID.';
			throw new Error(errorMessage);
		}
	}, 50);
	*/
};

exports.stop = function() {

};
