var debug, server;

// Enable Worker messages
debug = require('debug');
debug.enable('Worker');

// Start the scraping engine and the web-based interface
require('./globals');
server = require(__interface).server;

server.start();
