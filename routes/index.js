var fs = require('fs');
var path = require('path');
var requireAll = require('require-all');

var files = fs.readdirSync(__dirname);

// require all the routes in the directories
files.forEach( function(filename) {
	if ( filename.indexOf('.js') < 0 ) {
		exports[filename] = requireAll(path.join(__dirname, filename));
	}
});
