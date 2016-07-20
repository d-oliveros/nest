/* eslint-disable key-spacing, no-multi-spaces, import/imports-first */
import './connection';
import mongoose from 'mongoose';
import invariant from 'invariant';
import { isString, isObject, pick } from 'lodash';
import inspect from 'util-inspect';
import logger from '../logger';

const debug = logger.debug('nest:queue');
const Mixed = mongoose.Schema.Types.Mixed;

/**
 * Schema
 */
const jobSchema = new mongoose.Schema({
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
}, { collection: 'jobs' });

/**
 * Hooks
 */
jobSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

/**
 * Static Methods
 */
Object.assign(jobSchema.statics, {

  /**
   * Creates a new job. If the job already exists, returns the existing job.
   *
   * @param {String}    key   The job's key.
   * @param {Object}    data  The job's data.
   * @returns {Object}        The created (or existing) job.
   */
  async createJob(key, data = {}) {
    invariant(isString(key), 'Key is not a string');
    invariant(isObject(data), 'Data is not an object');

    const newJob = { routeId: key, ...data };

    let job = await this
      .findOne(pick(newJob, 'routeId', 'query'))
      .exec();

    if (!job) {
      debug(`Creating job\n${inspect(newJob)}`);
      job = await this.create(newJob);
      job.wasNew = true;
    } else {
      job.wasNew = false;
    }

    return job;
  }
});

/**
 * Indexes
 */
jobSchema.index({ priority: -1 });
jobSchema.index({ 'state.finished': -1 });
jobSchema.index({ priority: -1, 'state.finished': -1 });

/**
 * @providesModule Queue
 */
export default mongoose.model('Queue', jobSchema);
