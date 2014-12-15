var mongoose = require('mongoose');

var host     = __config.mongo.host;
var db       = __config.mongo.db;
var user     = __config.mongo.user;
var password = __config.mongo.password;

var prefix = 'mongodb://';
var authString = user ? user+':'+password+'@' : '';
var suffix = host+'/'+db;

mongoose.connect(prefix+authString+suffix);

module.exports = mongoose.connection;
