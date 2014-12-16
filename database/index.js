
// Database models
exports.Item = require('./Item');
exports.Operation = require('./Operation');

// Database connections
exports.redis = require('./redis');
exports.mongo = require('./mongo');

// Expose a method to disconnect the databases
exports.disconnect = function(force) {
	if (force) {
		exports.redis.end();		
		exports.mongo.close();
	} else {
		exports.redis.quit();
		exports.mongo.close();
	}
};
