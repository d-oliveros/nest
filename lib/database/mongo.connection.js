var mongoose = require('mongoose');
var config = require('../../config');

var host   = config.mongo.host;
var port   = config.mongo.port || 27017;
var db     = config.mongo.db;
var user   = config.mongo.user;
var pass   = config.mongo.pass;

var authString = user ? user+':'+pass+'@' : '';
var hostString = host+':'+port+'/'+db;

mongoose.connect('mongodb://'+authString+hostString);

module.exports = mongoose.connection;
