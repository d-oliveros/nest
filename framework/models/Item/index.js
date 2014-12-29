
// Make sure the database is initialized
require(__framework+'/database');

var mongoose = require('mongoose');

var modelSchema = require('./schema');
var model = mongoose.model('Item', modelSchema);

module.exports = model;
