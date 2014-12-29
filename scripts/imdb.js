// Starts the movie search route operation on IMDB sorted by user rating count
// this operation can go all the way up to 100k items
var debug = require('debug');
debug.enable('Agent*');

require('../globals');

var imdbSearchRoute = require(__routes+'/imdb/search');

console.log('IMDB Movie Search Route Starting...');
imdbSearchRoute.start();
