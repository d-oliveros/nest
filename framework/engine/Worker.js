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
	var self = this;

	// Start the worker loop
	async.whilst(this.isRunning.bind(this), function(callback) {
		Worker.loaderQueue.push(self.startNextOperation.bind(self), function(err, agent) {
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
	}, function() {
		self.emit('worker:stopped', self);
	});
};

// This will add the task to a queue that will be processed in series
Worker.loaderQueue = async.queue( function(task, callback) {
	task(callback);
}, 1);

// Returns an operation that has not finished, and it's not running
Worker.prototype.startNextOperation = function(callback) {
	var self = this;

	debug('Worker querying for next operation.');

	Operation.getNext(state, function(err, operation) {
		if (err) return callback(err);

		if ( !self.isRunning() ) {
			return callback();
		}

		if (operation) {
			self.operationId = operation._id.toString();

			debug('Worker got operation: '+operation.route.name+' ('+operation.query+')');
			var agent = new Agent();
			agent.addEmitter(self);
			agent.run(operation);
			return callback(null, agent);
		}
		
		// If there are no new operations to process, 
		// keep on quering for them each second.
		debug('There are no pending operations. Retrying in 1s');
		self.timeoutPromise = setTimeout( function() {
			self.timeoutPromise = null;
			self.startNextOperation(callback);
		}, 1000);
	});
};

Worker.prototype.isRunning = function() {
	return !!this.running || false;
};
