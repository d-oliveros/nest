const async = require('async');
const _ = require('lodash');

const githubSearchRoute = require('../github/search');
const queries = [];
const ops = [];

// Define the languages filters to use
const languages = [
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

// Define the sort option
const sorts = [
  '',
  's=followers&o=desc',
  's=followers&o=asc',
  's=repositories&o=desc',
  's=repositories&o=asc',
  's=joined&o=desc',
  's=joined&o=asc'
];

// Define the search queries to search for
queries.push('repos%3A>50');

for (let i = 50; i >= 0; i--) {
  queries.push('repos%3A' + i);
}

_.each(queries, function(query) {
  _.each(languages, function(language) {
    _.each(sorts, function(sort) {
      ops.push(query + '&' + language + (sort ? '&' + sort : ''));
    });
  });
});

// Exports: Scraping initialization script
//
// Starts user search operations on github by # of repositories
// using all the possible combinations of sorts and filters
//
exports.start = function() {

  // initialize the links to scrape using the github extractor
  console.log('Initializing ' + ops.length + ' search routes...');

  async.eachLimit(ops, 10, githubSearchRoute.initialize, function(err) {
    if (err) return console.error(err);

    console.log(ops.length + ' operations created. Script finished.');
    console.log('Starting the data extraction engine now...');

    const engine = require('../../src/engine');
    engine.start();
  });
};
