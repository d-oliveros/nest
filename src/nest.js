import fs from 'fs';
import path from 'path';
import requireAll from 'require-all';
import invariant from 'invariant';
import { isObject, isString, defaults, toArray, find } from 'lodash';
import { populateRoutes } from './route';
import mongoConnection from './db/connection';
import Operation from './db/Operation';
import createEngine from './engine';
import createSpider from './spider';

const nestProto = {

  /**
   * Scrapes a route, optionally providing a query
   *
   * @param  {Object|String} route Route key or loaded route object
   * @param  {String} query Query string
   * @return {Promise}
   */
  async scrape(route, query) {
    if (isString(route)) {
      route = this.getRoute(route);
    }

    invariant(route, `Route ${route} not found`);

    const operation = await this.initialize(query, route);
    const spider = createSpider();

    return await spider.scrape(operation, {
      routes: this.routes,
      plugins: this.plugins
    });
  },

  async initialize(route, query) {
    return await Operation.findOrCreate(query, route);
  },

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
}

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
export function createNest(root) {
  const nest = Object.create(nestProto);

  nest.load(root);
  nest.engine = createEngine(nest.routes, nest.plugins);
  nest.connection = mongoConnection;

  return nest;
}
