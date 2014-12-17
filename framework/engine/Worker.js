var async = require('async');
var debug = require('debug')('Worker');

var Agent     = require(__framework+'/Agent');
var Operation = require(__database+'/Operation');
var state     = require('./state');

// exports: Worker
//
module.exports = Worker;

function Worker() {
	Agent.call(this); // call super constructor

	this.timeoutPromise = null;
	this.running = true;

	this.startLoop();
}

Worker.prototype = Object.create( Agent.prototype );

Worker.prototype.startLoop = function() {
	var self, startNextOperation, checkIfRunning;

	self = this;

	startNextOperation = this.startNextOperation.bind(this);
	checkIfRunning     = this.isRunning.bind(this);

	// Start the worker loop
	async.whilst(checkIfRunning, loadOperation, onStop);

	function loadOperation(callback) {
		Worker.loaderQueue.push(startNextOperation, function(err, agent) {
			if (err) throw err;

			if (!agent) return callback();

			agent.once('error', function(err) {
				console.error(err);
				self.operationId = null;
				callback();
			});

			agent.once('operation:finish', function(operation) {
				debug('Worker finished operation.', operation.route.name);
				self.operationId = null;
				callback();
			});
		});
	}

	function onStop() {
		self.emit('worker:stopped', self);
	}

};

// This will add the task to a queue that will be processed in series
Worker.loaderQueue = async.queue( function(task, callback) {
	task(callback);
}, 1);

// Returns an agent running an operation.
Worker.prototype.startNextOperation = function(callback) {
	var self = this;

	debug('Worker querying for next operation.');

	Operation.getNext(state, function(err, operation) {
		if ( err || !self.isRunning() ) 
			return callback(err);

		var agent, operationRoute;

		// If there are no new operations to process, 
		// keep on quering for them each second.
		if ( !operation ) {
			debug('There are no pending operations. Retrying in 1s');
			self.timeoutPromise = setTimeout( function() {
				self.timeoutPromise = null;
				self.startNextOperation(callback);
			}, 1000);

			return;
		}

		self.operationId = operation._id.toString();

		operationRoute = operation.route.name;
		debug('Worker got operation: '+operationRoute+' '+operation.query);

		agent = new Agent();
		agent.addEmitter(self);
		agent.run(operation);

		callback(null, agent);
	});
};

Worker.prototype.isRunning = function() {
	return !!this.running || false;
};
