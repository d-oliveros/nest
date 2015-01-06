// Starts the movie search route operation on IMDB sorted by user rating count
// this operation can go all the way up to 100k items
var debug = require('debug');
var imdbSearchRoute = require('../routes/imdb/search');

debug.enable('Agent*');

console.log('IMDB Movie Search Route Starting...');

imdbSearchRoute.start();
