var debug, server;

// Enable Worker messages
debug = require('debug');
debug.enable('Worker');

// Start the engine
require('./globals');
var engine = require(__framework+'/engine');

engine.start();
console.log('Engine started');
