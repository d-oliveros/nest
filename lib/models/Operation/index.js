var mongoose = require('mongoose');

// make sure the database is initialized
require('../../database');

var modelSchema = require('./schema');
var model = mongoose.model('Operation', modelSchema);

module.exports = model;
