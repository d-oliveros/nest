import fs from 'fs';
import path from 'path';
import requireAll from 'require-all';
import invariant from 'invariant';
import { isObject, isString, defaults, toArray, find, pick } from 'lodash';
import { populateRoutes } from './route';
import { createEngine } from './engine';
import { createSpider } from './spider';
import mongoConnection from './db/connection';
import Action from './db/Action';
import Item from './db/Item';

/**
 * Requires the plugins, workers and routes from a root directory
 * @param  {String} rootdir Absolute path to the root directory
 * @return {Object}         Resolved modules
 */
const getNestModules = function(rootdir) {
  return ['plugins', 'workers', 'routes'].reduce((source, modType) => {
    const dir = path.join(rootdir, modType);

    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
      source[modType] = [];
    } else {
      const mods = requireAll({
        dirname: dir,
        resolve: (mod) => mod && mod.default ? mod.default : mod,
        recursive: true
      });

      source[modType] = toArray(mods);

      if (modType === 'routes') {
        source[modType] = populateRoutes(source[modType]);
      }
    }

    return source;
  }, {});
};

const Nest = {

  /**
   * Scrapes a route with the provided query
   *
   * @param  {Object|String}  route  Route key or loaded route object
   * @param  {String}  query  Query string. Optional.
   * @return {Promise}
   */
  async scrape(route, query) {
    if (isString(route)) {
      route = this.getRoute(route);
    }

    invariant(route, `Route ${route} not found`);

    const action = await this.initialize(query, route);
    const spider = createSpider();

    return await spider.scrape(action, {
      routes: this.routes,
      plugins: this.plugins
    });
  },

  /**
   * Initializes a route with the provided query.
   * @param  {Object}         route  A route instance
   * @param  {String|Object}  query  Query string. Optional.
   * @return {Object}                Resulting action definition.
   */
  async initialize(route, query) {
    return await Action.findOrCreate(route, query);
  },

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
  },

  /**
   * Gets a route by its route key
   * @param  {Object}  routeKey  The route's ID
   * @return {Object}            The route, or null if not found
   */
  getRoute(routeKey) {
    return find(this.routes, { key: routeKey });
  },

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
    invariant(root, `Root must be an object or string`);

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
};

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
const createNest = function(root) {
  const nest = Object.create(Nest);

  nest.load(root);
  nest.engine = createEngine(pick(nest, 'routes', 'plugins', 'workers'));
  nest.connection = mongoConnection;

  return nest;
};

export { createNest, getNestModules };
