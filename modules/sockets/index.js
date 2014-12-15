var debug = require('debug')('sockets');
var IO = require('socket.io');

exports.io = {};

exports.start = function(server) {
	exports.io = IO(server);
	exports.io.on('connection', function () {
		debug('A new socket has connected.');
	});
};
