import fs from 'fs';
import path from 'path';
import requireAll from 'require-all';
import invariant from 'invariant';
import { isObject, defaults, toArray, pick, find } from 'lodash';
import { populateRoutes } from './route';
import Engine from './engine';
import mongoConnection from './db/connection';
import Queue from './db/queue';
import Item from './db/item';

/**
 * Creates new a nest object.
 *
 * @param  {String|Object} root
 *  If a string is passed, it will require the routes, plugins and workers
 *  using this string as the root directory.
 *
 *  Otherwise, root must be an object with:
 *  - {Object} routes Routes to use
 *  - {Object} plugins Plugins to use
 *
 * @return {Object} A nest instance
 */
export default class Nest {
  constructor(root) {
    this.load(root);
    this.engine = new Engine(pick(this, 'routes', 'plugins', 'workers'));
    this.connection = mongoConnection;

    this.models = {
      item: Item,
      job:  Queue
    };
  }

  /**
   * Creates a new job. If the job already exists, returns the existing job.
   *
   * @param {String}    key   The job's route ID.
   * @param {Object}    data  The job's data.
   * @returns {Object}        The created (or existing) job.
   */
  async createJob(key, { query, priority }) {
    return await Queue.createJob(key, { query, priority });
  }

  /**
   * Creates or updates an item in the database.
   *
   * Note that if an item with the same key already exists,
   * this item will be augmented instead.
   *
   * @param {Object}     item  The item to add.
   * @returns {Promise}        The item that was just upserted.
   */
  addItem(item) {
    return Item.upsert(item);
  }

  /**
  * Exposes the mongoose Items and Jobs models for custom uses
  */

  /**
   * Starts processing the queue.
   *
   * @return {Promise}
   *  Promise to be resolved when all the queue's workers have started.
   */
  async startQueue() {
    await this.engine.start();
  }

  /**
   * Gets a route definition by route key.
   *
   * @param  {String}  key  The route's key
   * @return {Object}       The route's definition
   */
  getRoute(key) {
    return find(this.routes, { key });
  }

  /**
   * Loads a new environment
   *
   * @param  {String|Object} root
   *  If a string is passed, it will require the routes, plugins and workers
   *  using this string as the root directory.
   *
   *  Otherwise, root must be an object with:
   *  - {Object} routes Routes to use
   *  - {Object} plugins Plugins to use
   */
  load(root) {
    invariant(root, 'Root must be an object or string');

    let source;

    if (isObject(root)) {
      source = {
        routes: populateRoutes(root.routes),
        plugins: toArray(root.plugins),
        workers: toArray(root.workers)
      };
    } else {
      source = getNestModules(root);
    }

    Object.assign(this, defaults(source, {
      routes: [],
      plugins: [],
      workers: []
    }));
  }
}

/**
 * Requires the plugins, workers and routes from a root directory
 * @param  {String} rootdir Absolute path to the root directory
 * @return {Object}         Resolved modules
 */
export function getNestModules(rootdir) {
  return ['plugins', 'workers', 'routes'].reduce((source, modType) => {
    const dir = path.join(rootdir, modType);

    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
      source[modType] = [];
    } else {
      const mods = requireAll({
        dirname: dir,
        resolve: (mod) => (mod && mod.default ? mod.default : mod),
        recursive: true
      });

      source[modType] = toArray(mods);

      if (modType === 'routes') {
        source[modType] = populateRoutes(source[modType]);
      }
    }

    return source;
  }, {});
}
