
// Exports: Scraping initialization script
//
// Starts extracting data from animalpolitico
// by searching the word "que", and spawning crawlers to the posts
//
exports.start = function() {
  console.log('Initializing animalpolitico...');

  var searchRoute = require('./search');
  var engine = require('../../src/engine');

  searchRoute.initialize('que', function() {
    engine.start();
  });
};
