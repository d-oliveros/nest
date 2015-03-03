var _ = require('lodash');
var fs = require('fs');
var env = process.env.NODE_ENV || 'local';

var envPath = fs.existsSync(__dirname+'/environments/'+env+'.js') ?
	__dirname+'/environments/'+env :
	__dirname+'/environments/default.js';

exports.phantom = require('./phantom.config');
exports.engine = require('./engine.config');

_.assign(exports, require(envPath));
