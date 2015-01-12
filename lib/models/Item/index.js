
// Make sure the database is initialized
require('../../database');

var mongoose = require('mongoose');

var modelSchema = require('./schema');
var model = mongoose.model('Item', modelSchema);

module.exports = model;
