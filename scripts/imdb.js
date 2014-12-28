var debug = require('debug');
debug.enable('Agent*');

require('../globals');

var imdbSearchRoute = require(__routes+'/imdb/search');

console.log('IMDB Movie Search Route Starting...');
imdbSearchRoute.start();
