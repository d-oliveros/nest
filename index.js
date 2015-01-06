
// Enable Worker messages
var debug = require('debug');
debug.enable('Worker');
debug.enable('Agent*');

// Start the engine
require('./framework/engine').start();

console.log('Engine started');
