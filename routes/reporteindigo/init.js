
// Exports: Scraping initialization script
//
// Starts extracting data from reporteindigo
// by searching the word "que", and spawning crawlers to the tags and posts
//
exports.start = function() {
  console.log('Initializing reporteindigo...');

  var searchRoute = require('./search');
  var engine = require('../../src/engine');

  searchRoute.initialize('que', function() {
    engine.start();
  });
};
