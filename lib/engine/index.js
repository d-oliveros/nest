var async = require('async');
var Worker = require('./worker');
var config = require('../../config');

// Exports: Engine
//
var engine = module.exports = {
	emitter: require('./emitter'),
	state: require('./state'),
	started: false,
};

// Static: start the workers
engine.start = function() {
	var worker;

	if ( !this.started ) {
		for (var i = 0, len = config.engine.workers; i < len; i++) {
			worker = new Worker();
			worker.addEmitter(engine.emitter);
			engine.state.workers.push(worker);
		}
		this.started = true;
	}
};

// Static: stop the workers
engine.stop = function(callback) {
	callback = callback || function(){};
	
	async.each(engine.state.workers, stopWorker, function() {
		engine.started = false;
		engine.state.workers = [];
		callback();
	});
};

function stopWorker (worker, callback) {
	worker.stop(callback);
}
