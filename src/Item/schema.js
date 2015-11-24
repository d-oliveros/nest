import mongoose from 'mongoose';
import { extend } from 'lodash';
import * as statics from './statics';

const schemaOptions = {
  strict: false
};

const schema = new mongoose.Schema({
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
extend(schema.statics, statics);

// Indexes
schema.index({ 'name': -1 });
schema.index({ 'provider': -1 });
schema.index({ 'providers.route': -1 });

export default schema;
