var environment;

try {
	environment = require('./environments/'+__env);
} catch(err) {
	environment = require('./environments/default');
}

module.exports = environment;

module.exports.phantom   = require('./phantom.config');
module.exports.interface = require('./interface.config');
module.exports.engine    = require('./engine.config');
module.exports.lint      = require('./lint.config');
