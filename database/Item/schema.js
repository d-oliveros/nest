var mongoose = require('mongoose');

//var addHooks    = require('./schema.hooks');
//var addVirtuals = require('./schema.virtuals');

var providerSchema = require('./provider.schema');

var schema = new mongoose.Schema({
	name:     { type: String, trim: true },
	key:      { type: String, required: true, unique: true, lowercase: true, trim: true },
	created:  { type: Date, default: Date.now },

	providers: [providerSchema],
}, { 
	collection: 'items',
});

schema.statics = require('./statics');
schema.methods = require('./methods');

schema.index({ 'name': -1 });
schema.index({ 'providers.name': -1 });
schema.index({ 'providers.route': -1 });

module.exports = schema;
