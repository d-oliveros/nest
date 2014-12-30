var winston = require('winston');
var path = require('path');
var debug = require('debug');

var logPath = path.join(__dirname, 'logs', 'master.log');

var config = {
	levels: {
		silly: 0,
		verbose: 1,
		info: 2,
		event: 3,
		warn: 4,
		error: 5,
		debug: 6,
	},
	colors: {
		silly: 'magenta',
		verbose: 'cyan',
		info: 'green',
		event: 'orange',
		warn: 'yellow',
		error: 'red',
		debug: 'blue'
	},
};

// Exports: logger
//
var logger = module.exports = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			level: 'debug',
			colorize: true,
			timestamp: true,
		}),
		new (winston.transports.File)({ 
			filename: logPath,
			level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
		})
	],
	levels: config.levels,
	colors: config.colors,
});


// Overriding: winston.Logger.debug
//
logger.debug = function(key) {
	var debugMessage = debug(key);

	return function(message, meta) {
		logger.log(
			'debug', 
			'['+new Date().toLocaleString()+'] '+key+': '+message, meta
		);

		debugMessage(message);
	};
};
