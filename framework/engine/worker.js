var async = require('async');
var debug = require('debug')('Worker');

var Agent     = require(__framework+'/agent');
var Operation = require(__framework+'/models/Operation');
var state     = require('./state');

// exports: Worker
//
module.exports = Worker;

function Worker() {
	Agent.call(this); // call super constructor

	this.timeoutPromise = null;
	this.running = true;

	// Bind the methods to itself
	this.isRunning          = this.isRunning.bind(this);
	this.startNextOperation = this.startNextOperation.bind(this);

	// Set up debugging listeners
	this.on('operation:start', function(operation, url) {
		debug('Scraping: '+url);
	});

	this.on('operation:blocked', function(operation, url) {
		debug('Request blocked on: '+url);
	});

	this.startLoop();
}

// This will ensure the operations are loaded in series
Worker.loaderQueue = async.queue( function(task, callback) {
	task(callback);
}, 1);

Worker.prototype = Object.create( Agent.prototype );

Worker.prototype.startLoop = function() {
	var self = this;

	// Start the worker loop
	async.whilst(self.isRunning, loadOperation, onStop);

	function loadOperation(callback) {
		Worker.loaderQueue.push(self.startNextOperation, function(err, agent) {
			if (err) throw err;
			if (!agent) return callback();

			agent.once('error', function(err) {
				console.error(err);
				self.operationId = null;
				callback();
			});

			agent.once('operation:finish', function(operation) {
				debug(
					'Operation finished: '+operation.route.name+'. '+
					operation.stats.items+' items created. '+
					operation.stats.updated+' items updated. '+
					operation.stats.spawned+' operations created.'
				);

				self.operationId = null;
				callback();
			});
		});
	}

	function onStop() {
		self.emit('worker:stopped', self);
	}

};

// Returns an agent running an operation.
Worker.prototype.startNextOperation = function(callback) {
	var self = this;

	Operation.getNext(state, function(err, operation) {
		var agent, routeName, query;

		if ( err || !self.isRunning() )
			return callback(err);

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

		routeName = operation.route.name;
		query = operation.query;

		debug('Got operation: '+routeName+'. Query: '+query);

		agent = new Agent();
		agent.addEmitter(self);
		agent.run(operation);

		callback(null, agent);
	});
};

Worker.prototype.isRunning = function() {
	return !!this.running || false;
};
