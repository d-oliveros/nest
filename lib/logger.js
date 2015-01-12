var winston = require('winston');
var debug = require('debug');
var path = require('path');

var logPath = path.normalize( path.join(__dirname,'..', 'nest.log') );

var config = {
	levels: {
		verbose: 1,
		debug: 2,
		info: 3,
		event: 4,
		warn: 5,
		error: 6,
	},
	colors: {
		verbose: 'cyan',
		debug: 'blue',
		info: 'green',
		event: 'orange',
		warn: 'yellow',
		error: 'red',
	},
};

// Exports: logger
//
var logger = module.exports = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
			level: 'info',
			colorize: true,
			timestamp: true,
		}),
		new (winston.transports.File)({

			// todo: don't log all debug messages, except when env var is set 
			level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

			filename: logPath,
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
		logger.log('debug', key+': '+message, meta);
		debugMessage(message);
	};
};
