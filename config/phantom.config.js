
exports.parameters = {
	'load-images': 'no',
	'ignore-ssl-errors': 'yes',
};

// Enables console.log's on PhantomJS scraping functions
if ( process.env.PHANTOM_LOG !== 'true' ) {
	exports.onStdout = function(){};
	exports.onStderr = function(){};
}
