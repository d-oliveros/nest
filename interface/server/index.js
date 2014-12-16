var http = require('http');
var app = require('./app');

var server = http.createServer(app);
var sockets = require(__interface+'/websockets');
var engine  = require(__framework+'/engine');

server.start = function(callback) {
	callback = callback || console.log.bind(console, 'Server started.');

	engine.start();

	// Send engine events through web sockets
	engine.emitter.addEmitter(sockets.io);

	sockets.start(server);
	
	this.listen(__config.interface.port, callback);
};

module.exports = server;
