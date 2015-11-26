import { compact, map, isFunction, isObject } from 'lodash';
const plugins = require('require-all')(__dirname);

export default compact(map(plugins, (plugin) => {
  if (isFunction(plugin)) return plugin;
  if (isObject(plugin) && isFunction(plugin.default)) return plugin.default;
}));
