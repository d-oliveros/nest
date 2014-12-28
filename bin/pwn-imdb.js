var debug = require('debug');
debug.enable('Agent*');

require('../globals');
require(__database);

var imdbSearchRoute = require(__routes+'/imdb/search');
imdbSearchRoute.start();

console.log('IMDB Movie Search Route Started.');
console.log('Hint: Run with DEBUG=*');
