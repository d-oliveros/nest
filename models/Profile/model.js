var mongoose = require('mongoose');

var modelSchema = require('./schema');
var model = mongoose.model('Profile', modelSchema);

module.exports = model;
