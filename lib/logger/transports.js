var winston = require('winston');
var path = require('path');

var logPath = path.normalize( path.join(__dirname,'..', '..', 'nest.log') );
var env = process.env;

var transports = [
	new (winston.transports.Console)({
		level: 'info',
		colorize: true,
		timestamp: true,
	})
];

if ( env.NEST_LOG === 'true' ) {
	transports.push( new (winston.transports.File)({
		level: env.NODE_ENV === 'production' ? 'info' : 'debug',
		filename: logPath,
	}));
}

// Exports: logger transports
//
module.exports = transports;
