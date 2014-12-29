var mongoose = require('mongoose');
var providerSchema = require('./provider.schema');

// Schema
var schema = new mongoose.Schema({
	name: { 
		type: String, 
		trim: true 
	},

	key: { 
		type: String, 
		required: true, 
		unique: true, 
		lowercase: true, 
		trim: true 
	},
	
	created: { 
		type: Date, 
		default: Date.now 
	},

	providers: [ providerSchema ],
}, { 
	collection: 'items',
});

// Statics methods
schema.statics = require('./static.methods');

// Instance methods
schema.methods = require('./instance.methods');

// Index
schema.index({ 'name': -1 });
schema.index({ 'providers.name': -1 });
schema.index({ 'providers.route': -1 });

module.exports = schema;
