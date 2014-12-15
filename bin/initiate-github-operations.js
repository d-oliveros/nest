require('../globals');
require(__database);

var scripts = require(__interface+'/server/scripts');

scripts.createGithubOperations(function() {
	console.log('Finished.');
	process.exit(0);
});
