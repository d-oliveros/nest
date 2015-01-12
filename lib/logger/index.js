var winston = require('winston');
var debug = require('debug');

var config = require('./config');
var transports = require('./transports');

// Exports: logger
//
var logger = module.exports = new (winston.Logger)({
	transports: transports,
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
