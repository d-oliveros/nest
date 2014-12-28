var _ = require('lodash');
var mongoose = require('mongoose');
var Mixed    = mongoose.Schema.Types.Mixed;

var addHooks      = require('./hooks');
var addVirtuals   = require('./virtuals');
var statics       = require('./statics');
var methods       = require('./methods');

var schema = new mongoose.Schema({
	routeName:    { type: String, required: true },
	query:        { type: String, default: '' },
	
	priority:     { type: Number, default: 50 },
	created:      { type: Date,   default: Date.now },

	state: {
		currentPage:  { type: Number,  default: 1 },
		finished:     { type: Boolean, default: false },
		finishedDate: { type: Date },
		startedDate:  { type: Date },
		data:         { type: Mixed, default: {} },
	},

	stats: {
		pages:    { type: Number, default: 0 },
		results:  { type: Number, default: 0 },
		items:    { type: Number, default: 0 },
		updated:  { type: Number, default: 0 },
		spawned:  { type: Number, default: 0 },
	},
}, { collection: 'operations' });

addVirtuals(schema);
addHooks(schema);

_.extend(schema.statics, statics);
_.extend(schema.methods, methods);

//schema.index({ 'route': -1 });
schema.index({ 'state.finished': -1 });

module.exports = schema;
