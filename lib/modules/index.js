var fs = require('fs');
var files = fs.readdirSync(__dirname);

// require all the routes in the directories
files.forEach( function(filename) {
	if ( filename.indexOf('.js') < 0 ) {
		exports[filename] = require('./'+filename);
	}
});
