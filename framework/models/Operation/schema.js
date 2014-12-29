var mongoose = require('mongoose');
var Mixed = mongoose.Schema.Types.Mixed;

// Schema
var schema = new mongoose.Schema({
	routeName:    { type: String, required: true },
	query:        { type: String, default: '' },
	priority:     { type: Number, default: 50 },
	created:      { type: Date,   default: Date.now },

	stats: {
		pages:    { type: Number, default: 0 },
		results:  { type: Number, default: 0 },
		items:    { type: Number, default: 0 },
		updated:  { type: Number, default: 0 },
		spawned:  { type: Number, default: 0 },
	},

	state: {
		currentPage:  { type: Number,  default: 1 },
		finished:     { type: Boolean, default: false },
		finishedDate: { type: Date },
		startedDate:  { type: Date },
		data:         { type: Mixed, default: {} },
	},
}, { collection: 'operations' });


// Virtuals
schema.virtual('routeDomain').get( function() {
	var routeDomain = this.routeName.split(':')[0];
	return require(__routes)[routeDomain];
});

schema.virtual('route').get( function() {
	var targetRoute = this.routeName.split(':')[1];
	return this.routeDomain[targetRoute];
});

// Hooks
schema.pre('save', function(next) {
	this.wasNew = this.isNew;
	next();
});

// Static methods
schema.statics = require('./statics');

// Index
//schema.index({ 'route': -1 });
schema.index({ 'state.finished': -1 });

module.exports = schema;
