var Operation = require(__framework+'/models/Operation');
var Agent     = require(__framework+'/agent');

exports.start = function(query) {
	var agent = new Agent();

	this.initialize(query, function(err, operation) {
		if (err) return agent.error(err);
		agent.run(operation);
	});

	return agent;
};

exports.initialize = function(query, callback) {
	var operationQuery = {
		query:     query,
		routeName: this.name,
		priority:  this.priority,
	};

	Operation.findOrCreate(operationQuery, callback);
};

// Default middleware
exports.middleware = function(scraped, callback) {
	callback(null, scraped);
};

// Default scraper
exports.scraper = function() {
	throw new Error('You need to implement your own scraper.');
};

// Checks if the page has been blocked
// Should return status string with possible values:
// - 'blocked'
// - 'ok'
exports.checkStatus = function() {
	return 'ok';
};

// Default urlTemplate
exports.urlTemplate = function() {
	throw new Error('You need to implement your own URL generator.');
};
