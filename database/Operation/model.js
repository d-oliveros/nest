var mongoose = require('mongoose');

var modelSchema = require('./schema');
var model = mongoose.model('Operation', modelSchema);

module.exports = model;
