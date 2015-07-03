var async = require('async');

var subredditRoute = require('../reddit/wall');

var subreddits = [
  'cscareerquestions',
  'compsci',
  'careerguidance',
  'ITCareerQuestions'
];

// Exports: Scraping initialization script
//
// Starts subreddit scraping operations on reddit
// using a really small subset of subreddit groups
//
exports.start = function() {
  console.log('Initializing '+subreddits.length+' subreddit routes...');

  async.eachLimit(subreddits, 10, subredditRoute.initialize, function(err) {
    if (err) return console.error(err);

    console.log(subreddits.length+' operations created. Script finished.');
    console.log('Starting the data extraction engine now...');

    var engine = require('../../src/engine');
    engine.start();
  });
};
