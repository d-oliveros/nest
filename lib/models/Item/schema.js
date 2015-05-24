import mongoose from 'mongoose';

// Schema
let schemaOptions = {
  strict: false
};

let schema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },

  type: {
    type: String,
    default: 'content'
  },

  provider: {
    type: String,
    required: true
  },

  route: {
    type: String,
    required: true
  },

  link: {
    type: String
  },

  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  routeWeight: {
    type: Number,
    default: 50
  },

  created: {
    type: Date,
    default: Date.now
  }
}, schemaOptions);

// Statics methods
schema.statics = require('./statics');

// Indexes
schema.index({ 'name': -1 });
schema.index({ 'provider': -1 });
schema.index({ 'providers.route': -1 });

export default schema;
