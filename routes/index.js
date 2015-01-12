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

// Exports: routes
//
module.exports = routes;
