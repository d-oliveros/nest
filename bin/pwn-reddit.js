require('../globals');
require(__database);

var async = require('async');

// Create the operations list to send to Nest
var subreddits = [
	'cscareerquestions',
	'compsci',
	'careerguidance',
	'ITCareerQuestions',
];

// Create the operations on Nest
var subredditRoute = require(__routes+'/reddit/wall');

async.eachLimit(subreddits, 10, function(subreddit, callback) {
	console.log('Starting op: reddit:wall ('+subreddit+')');
	subredditRoute.initialize(subreddit, callback);
}, function(err) {
	if (err) return console.error(err);
	console.log(subreddits.length+' operations created. Script finished.');
});
