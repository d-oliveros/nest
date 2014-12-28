var debug = require('debug');
debug.enable('Worker');

require('./globals');
require(__database);

var server = require(__interface).server;

server.start();
