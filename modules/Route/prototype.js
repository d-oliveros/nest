var Operation = require(__models+'/Operation');
var Agent     = require(__modules+'/Agent');

exports.start = function(query) {
	var route, agent, operationQuery;

	route = this;
	agent = new Agent();

	operationQuery = {
		query:     query,
		routeName: route.name,
		priority:  route.priority,
	};

	Operation.findOrCreate(operationQuery, function(err, operation) {
		if (err) return agent.error(err);
		agent.run(operation);
	});

	return agent;
};

// Default middleware
exports.middleware = function(scraped, callback) {
	callback(null, scraped);
};

exports.scraper = function() {
	throw new Error('You need to implement your own scraper.');
};

exports.urlTemplate = function() {
	throw new Error('You need to implement your own URL generator.');
};
