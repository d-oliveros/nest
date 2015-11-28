import fs from 'fs';
import path from 'path';
import requireAll from 'require-all';
import camelCase from 'camelcase';
import invariant from 'invariant';
import { isObject, defaults } from 'lodash';
import { populateRoutes } from './route';
import mongoConnection from './db/connection';
import Operation from './db/Operation';
import createEngine from './engine';
import createSpider from './spider';

const nestProto = {

  /**
   * Scrapes a route, optionally providing a query
   *
   * @param  {Object} route Route definition
   * @param  {String} query Query string
   * @return {Promise}
   */
  async scrape(route, query) {
    invariant(route, `Route ${route} not found`);

    const operation = await Operation.findOrCreate(query, route);
    const spider = createSpider();

    return await spider.scrape(operation, {
      routes: this.routes,
      plugins: this.plugins
    });
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
        plugins: root.plugins,
        workers: root.workers
      };
    } else {
      source = getNestModules(root);
    }

    Object.assign(this, defaults(source, {
      routes: {},
      plugins: {},
      workers: {}
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
export function createNest(root) {
  const nest = Object.create(nestProto);

  nest.load(root);
  nest.engine = createEngine(nest.routes, nest.plugins);
  nest.connection = mongoConnection;

  return nest;
}

/**
 * Requires the plugins, workers and routes from a root directory
 * @param  {String} rootdir Absolute path to the root directory
 * @return {Object}         Resolved modules
 */
export function getNestModules(rootdir) {
  return ['plugins', 'workers', 'routes'].reduce((source, pathname) => {
    const dir = path.join(rootdir, pathname);

    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
      source[pathname] = {};
    } else {
      source[pathname] = requireAll({
        dirname: dir,
        resolve: (mod) => mod && mod.default ? mod.default : mod,
        recursive: true,
        map: (name) => {
          return camelCase(name);
        }
      });
    }

    return source;
  }, {});
}
