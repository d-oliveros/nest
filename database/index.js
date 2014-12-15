
exports.redis = require('./redis');
exports.mongo = require('./mongo');

exports.disconnect = function(force) {
	if (force) {
		exports.redis.end();		
		exports.mongo.close();
	} else {
		exports.redis.quit();
		exports.mongo.close();
	}
};
