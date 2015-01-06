var _ = require('lodash'), environment;
var env = process.env.NODE_ENV || 'local';

exports.phantom   = require('./phantom.config');
exports.interface = require('./interface.config');
exports.engine    = require('./engine.config');

try {
	environment = require('./environments/'+env);
} catch(err) {
	environment = require('./environments/default');
}

_.assign(exports, environment);
