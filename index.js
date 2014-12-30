
// Enable Worker messages
var debug = require('debug');
debug.enable('Worker');

// Start the engine
require('./globals');
var engine = require(__framework+'/engine');

engine.start();
console.log('Engine started');
