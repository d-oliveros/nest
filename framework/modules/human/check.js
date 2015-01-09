
// load the human names list
var names;
try {
	names = require('./names');
	if ( !(names instanceof Array) )
		names = [];

} catch(err) {
	if ( err.code === 'MODULE_NOT_FOUND' )
		names = [];

	else
		throw err;
}

// Exports: func
// checks if a string is a human name
//
module.exports = function(string) {
	if ( names.length === 0 ) return null;

	var words = string.split(' ');
	var isHuman = false;

	for (var i = 0, len = words.length; i < len; i++) {
		if ( names.indexOf(words[i].toLowerCase().trim()) > -1 ) {
			isHuman = true;
			break;
		}
	}

	return isHuman;
};
