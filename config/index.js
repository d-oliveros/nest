var _ = require('lodash'), environment;

exports.phantom   = require('./phantom.config');
exports.interface = require('./interface.config');
exports.engine    = require('./engine.config');
exports.lint      = require('./lint.config');

try {
	environment = require('./environments/'+__env);
} catch(err) {
	environment = require('./environments/default');
}

_.assign(exports, environment);
