var Worker = require('./worker');

// Exports: Engine
var engine = module.exports = {};

engine.emitter = require('./emitter');
engine.state   = require('./state');

// Static: start the workers
engine.start = function() {
	var worker;

	for (var i = 0, len = __config.engine.workers; i < len; i++) {
		worker = new Worker();
		worker.addEmitter(engine.emitter);
		engine.state.workers.push(worker);
	}
};

// Static: stop the workers
engine.stop = function() {
	// todo
};
