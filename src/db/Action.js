/* eslint-disable key-spacing, no-multi-spaces */
import './connection';
import mongoose from 'mongoose';
import invariant from 'invariant';
import { isString, isObject, extend, pick, isArray } from 'lodash';
import inspect from 'util-inspect';
import logger from '../logger';

const debug = logger.debug('nest:action');
const Mixed = mongoose.Schema.Types.Mixed;


/**
 * Schema
 */
const schema = new mongoose.Schema({
  routeId:   { type: String, required: true },
  query:     { type: Mixed },
  priority:  { type: Number, default: 50 },
  created:   { type: Date,   default: Date.now },
  updated:   { type: Date },

  stats: {
    pages:   { type: Number, default: 0 },
    results: { type: Number, default: 0 },
    items:   { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    spawned: { type: Number, default: 0 }
  },

  state: {
    currentPage:  { type: Number,  default: 1 },
    finished:     { type: Boolean, default: false },
    finishedDate: { type: Date },
    startedDate:  { type: Date },
    data:         { type: Mixed, default: {} }
  }
});


/**
 * Hooks
 */
schema.pre('save', function(next) {
  this.wasNew = this.isNew;
  next();
});


/**
 * Static Methods
 */
extend(schema.statics, {

  /**
   * Finds an action. If the action does not exist, creates a new action.
   *
   * @param {String}    key   The action's key.
   * @param {Object}    data  The action's data.
   * @returns {Object}        The created or updated action.
   */
  async findOrCreate(key, data = {}) {
    invariant(isString(key), 'Key is not a string');
    invariant(isObject(data), 'Route is not an object');
    invariant(!isArray(data), 'Data arrays not supported');

    const newAction = { routeId: key, ...data };

    let action = await this
      .findOne(pick(newAction, 'routeId', 'query'))
      .exec();

    if (!action) {
      debug(`Creating action\n${inspect(newAction)}`);
      action = await this.create(newAction);
      action.wasNew = true;
    } else {
      action.wasNew = false;
    }

    return action;
  }
});


/**
 * Indexes
 */
schema.index({ 'priority': -1 });
schema.index({ 'state.finished': -1 });
schema.index({ 'priority': -1, 'state.finished': -1 });


/**
 * @providesModule Action
 */
export default mongoose.model('Action', schema);
