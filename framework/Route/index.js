var _ = require('lodash');

var debug = require('debug')('Route');

function Route(params) {
	if ( params.name.indexOf(':') < 0 )
		throw new Error('Invalid route: '+params.name);
	
	var name  = params.name;
	var parts = name.split(':');

	debug('Creating new route', params);

	this.title       = params.title;
	this.name        = params.name;

	this.domain      = parts[0];
	this.key         = parts[1];

	this.priority    = params.priority;

	this.urlTemplate = _.template(params.url);

	this.test        = params.test || null;

	this.scraper     = params.scraper ? params.scraper : this.scraper;
	this.middleware  = params.middleware ? params.middleware : this.middleware;

	if ( typeof this.priority === 'undefined' ) {
		this.priority = 50;
	}
}

Route.get = function(routeName) {
	var parts = routeName.split(':');
	var domain = parts[0];
	var path = parts[1];
	return require(__routes)[domain][path];
};

Route.prototype = require('./prototype');

module.exports = Route;
