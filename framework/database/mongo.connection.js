var mongoose = require('mongoose');

var config   = require('../../config');
var host     = config.mongo.host;
var db       = config.mongo.db;
var user     = config.mongo.user;
var password = config.mongo.password;

var prefix = 'mongodb://';
var authString = user ? user+':'+password+'@' : '';
var suffix = host+'/'+db;

mongoose.connect(prefix+authString+suffix);

module.exports = mongoose.connection;
