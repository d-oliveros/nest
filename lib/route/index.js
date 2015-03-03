var _ = require('lodash');

var Operation = require('../models/Operation');
var _log = require('../logger');
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
	this.isDynamic   = params.dynamic || false;

	// template generation function. Takes an operation for input
	this.urlTemplate = _.template(params.url);

	// scraping function that should return an object with scraped data
	this.scraper     = params.scraper || this.scraper;

	// route-specific middleware to be executed after scraping data from a page
	this.middleware  = params.middleware || this.middleware;

	// scraping function that should return either 'ok' or 'blocked'
	this.checkStatus = params.checkStatus || this.checkStatus;

	// auto-testing options
	this.test        = params.test || null;

	// limit the amount of workers that can work on this route at the same time
	this.concurrency = params.concurrency || null;

	// bind the initialize method to itself
	this.initialize  = this.initialize.bind(this);
	
	// routes with higher priority will be processed first by the workers 
	this.priority    = params.priority;

	if ( typeof this.priority !== 'number' )
		this.priority = 50;
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

// starts this route, and return a running spider
Route.prototype.start = function(query) {
	var Spider = require('../spider');
	var spider = new Spider();

	this.initialize(query, function(err, operation) {
		if (err) return spider.error(err);
		spider.scrape(operation);
	});

	return spider;
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
