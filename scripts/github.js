require('../globals');

var async = require('async');
var _ = require('lodash');

// Create the search queries
var reposQueries = ['repos%3A>50'];

for(var i = 50; i >= 0; i--) {
	reposQueries.push('repos%3A'+i);
}

var languages = [
	'l=JavaScript', 
	'l=Java', 
	'l=PHP', 
	'l=Python', 
	'l=Ruby', 
	'l=CSS', 
	'l=C%2B%2B', 
	'l=C', 
	'l=C%23', 
	'l=Objective-C'
];

var sorts = [
	'', 
	's=followers&o=desc', 
	's=followers&o=asc', 
	's=repositories&o=desc', 
	's=repositories&o=asc', 
	's=joined&o=desc', 
	's=joined&o=asc'
];

var ops = [];

_.each(reposQueries, function(query) {
	_.each(languages, function(language) {
		_.each(sorts, function(sort) {
			ops.push(query+'&'+language+(sort ? '&'+sort : ''));
		});
	});
});

// Initialize the scraping operations on Nest
var githubSearchRoute = require(__routes+'/github/search');
async.eachLimit(ops, 10, startOperation, onComplete);

function startOperation(op, callback) {
	console.log('Starting op: github:search ('+op+')');
	githubSearchRoute.initialize(op, callback);
}

function onComplete(err) {
	if (err) return console.error(err);
	console.log(ops.length+' operations created. Script finished.');
	console.log('Now, start the engine. ( hint: node index )');
	process.exit(0);
}
