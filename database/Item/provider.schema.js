var mongoose = require('mongoose');
var Mixed    = mongoose.Schema.Types.Mixed;

var providerSchema = new mongoose.Schema({
	name:     { type: String, required: true },
	route:    { type: String, required: true },
	link:     { type: String },
	priority: { type: Number, default: 0, required: true },
	created:  { type: Date, default: Date.now, required: true },
	data:     { type: Mixed }, 
});

module.exports = providerSchema;
