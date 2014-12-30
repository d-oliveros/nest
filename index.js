
// Enable Worker messages
var debug = require('debug');
debug.enable('Worker');
debug.enable('Agent*');

// Start the engine
require('./globals');
var engine = require(__framework+'/engine');

engine.start();
console.log('Engine started');
