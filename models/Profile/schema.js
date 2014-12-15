var mongoose = require('mongoose');
var Mixed    = mongoose.Schema.Types.Mixed;

//var addHooks    = require('./schema.hooks');
//var addVirtuals = require('./schema.virtuals');

var providerSchema = new mongoose.Schema({
	link:     { type: String, required: true },
	route:    { type: String, required: true },
	username: { type: String },
	priority: { type: Number, default: 0, required: true },
	created:  { type: Date, default: Date.now, required: true },
	data:     { type: Mixed }, 
});

var schema = new mongoose.Schema({
	name:     { type: String, trim: true },
	email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
	created:  { type: Date, default: Date.now },
	image:    { type: String },
	website:  { type: String },
	location: { type: String },

	providers: [providerSchema],

	contacted: {
		date:      { type: Date },
		template:  { type: String },
		transport: { type: String },
	},

	keywords: { type: String },

}, { 
	collection: 'profiles',
});

schema.statics = require('./statics');
schema.methods = require('./methods');

schema.index({ 'name': -1 });
schema.index({ 'providers.name': -1 });
schema.index({ 'providers.route': -1 });

module.exports = schema;
