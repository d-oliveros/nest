var mongoose = require('mongoose');

// make sure the database is initialized
require(__framework+'/database');

var modelSchema = require('./schema');
var model = mongoose.model('Operation', modelSchema);

module.exports = model;
