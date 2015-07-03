
// Exports: Scraping initialization script
//
// Starts extracting data from sinembargo
// by searching the word "taco", and spawning crawlers to the posts
//
exports.start = function() {
  console.log('Initializing sinembargo...');

  var searchRoute = require('./search');
  var engine = require('../../src/engine');

  searchRoute.initialize('taco', function() {
    engine.start();
  });
};
