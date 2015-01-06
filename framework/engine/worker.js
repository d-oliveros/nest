var async = require('async');

var Agent       = require('../agent');
var Operation   = require('../models/Operation');
var loaderQueue = require('./loader.queue');
var state       = require('./state');

var _log = require('../../logger');
var debug = _log.debug('Worker');

// Exports: Worker
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

	this.start();
}

// Inherits from: Agent
Worker.prototype = Object.create( Agent.prototype );

// start this worker
Worker.prototype.start = function() {
	var self = this;

	async.whilst(self.isRunning, loadOperation, onStop);

	function loadOperation(callback) {
		loaderQueue.push(self.startNextOperation, function(err, agent) {
			if (err) throw err;
			if (!agent) return callback();

			agent.once('error', function(err) {
				console.error(err);
				self.operationId = null;
				callback();
			});

			agent.once('operation:finish', function(operation) {
				debug(
					'Operation finished: '+operation.route+'. '+
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
		// todo: pull worker from loaderQueue if was in queue
	}

};

// gets and starts the next operation, and returns a running agent
Worker.prototype.startNextOperation = function(callback) {
	var self = this;

	Operation.getNext(state, function(err, operation) {
		if ( err || !self.isRunning() )
			return callback(err);

		// if there are no new operations to process, 
		// keep on quering for them each second.
		if ( !operation ) {
			debug('There are no pending operations. Retrying in 1s');
			self.timeoutPromise = setTimeout( function() {
				self.timeoutPromise = null;
				self.startNextOperation(callback);
			}, 1000);

			return;
		}

		self.operationId = operation.id;

		var routeName = operation.route;
		var provider  = operation.provider;
		var query     = operation.query;
		var agent     = new Agent();

		debug('Got operation: '+provider+'->'+routeName+'. Query: '+query);

		agent.addEmitter(self);
		agent.run(operation);

		callback(null, agent);
	});
};

Worker.prototype.isRunning = function() {
	return !!this.running || false;
};
