var _ = require('lodash');

var Operation = require(__framework+'/models/Operation');
var debug = _log.debug('Route');

// Exports: Route
//
module.exports = Route;


function Route(params) {
	if ( !params.name )
		throw new Error('Name is required.');

	if ( !params.provider )
		throw new Error('Provider is required.');
	
	debug('Creating new route', params);

	this.title       = params.title;
	this.provider    = params.provider;
	this.name        = params.name;

	this.urlTemplate = _.template(params.url);
	this.scraper     = params.scraper || this.scraper;
	this.middleware  = params.middleware || this.middleware;
	this.checkStatus = params.checkStatus || this.checkStatus;

	this.test        = params.test || null;
	this.priority    = params.priority;

	if ( typeof this.priority === 'undefined' ) {
		this.priority = 50;
	}
}

// creates an operation to this route with the provided query argument
Route.prototype.initialize = function(query, callback) {
	var operationQuery = {
		query:     query,
		provider:  this.provider,
		route:     this.name,
		priority:  this.priority,
	};

	Operation.findOrCreate(operationQuery, callback);
};

// starts this route, and return a running agent
// 
Route.prototype.start = function(query) {
	var Agent = require(__framework+'/agent'); // shouldn't be requiring here
	var agent = new Agent();

	this.initialize(query, function(err, operation) {
		if (err) return agent.error(err);
		agent.run(operation);
	});

	return agent;
};


// default scraper
Route.prototype.scraper = function() {
	throw new Error('You need to implement your own scraper.');
};

// default urlTemplate
Route.prototype.urlTemplate = function() {
	throw new Error('You need to implement your own URL generator.');
};

// default middleware
Route.prototype.middleware = function(scraped, callback) {
	callback(null, scraped);
};

// default status checker.
Route.prototype.checkStatus = function() {
	return 'ok';
};

