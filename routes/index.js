var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var requireAll = require('require-all');

var files = fs.readdirSync(__dirname);
var routes = {};

// require all the routes in the directories
files.forEach( function(domain) {
	if ( domain.indexOf('.js') < 0 ) {
		routes[domain] = requireAll(path.join(__dirname, domain));
	}
});

// returns the routes in a nicely formatted string
routes.list = function() {
	var string = '\n';

	// for each folder
	_.each(this, function(domain, domainName) { 
		if ( domainName === 'list' ) return;

		string += domainName+'\n';

		// for each route
		_.each(domain, function(route, routeName) {

			string += '  '+domainName+':'+routeName;

			// warn on tests disabled
			if ( !route.test && routeName !== 'init' ) {
				string += ' (not testable)';
			}

			string += '\n';
		});
		string += '\n';
	});

	return string;
};

// Exports: routes
//
module.exports = routes;
