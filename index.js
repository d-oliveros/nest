
// Enable Worker messages
var debug = require('debug');
debug.enable('Worker');
debug.enable('Agent*');

// Start the engine
require('./lib/engine').start();

console.log('Engine started');
