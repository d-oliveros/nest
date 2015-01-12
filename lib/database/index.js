
// initialize the Mongo connection

exports.mongo = require('./mongo.connection');

// Static: Disconnect the databases
exports.disconnect = function() {
	exports.mongo.close();
};
