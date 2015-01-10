// Starts subreddit scraping operations on reddit
// using a really small subset of subreddit groups
var async = require('async');

var subredditRoute = require('../routes/reddit/wall');

var subreddits = [
	'cscareerquestions',
	'compsci',
	'careerguidance',
	'ITCareerQuestions',
];

console.log('Initializing '+subreddits.length+' subreddit routes...');
async.eachLimit(subreddits, 10, createSubredditOperation, onFinish);

function createSubredditOperation(subreddit, callback) {
	subredditRoute.initialize(subreddit, callback);
}

function onFinish(err) {
	if (err) return console.error(err);

	console.log(subreddits.length+' operations created. Script finished.');
	console.log('Starting the data extraction engine now...');

	var engine = require('../framework/engine');
	engine.start();
}
