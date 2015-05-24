var searchRoute = require('../imdb/search');

// Exports: Scraping initialization script
//
// Starts the movie search route operation on IMDB sorted by user rating count
// this operation can go all the way up to 100k items
//
exports.start = function() {
  console.log('IMDB Movie Search Route Starting...');
  searchRoute.start();
};
