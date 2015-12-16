import invariant from 'invariant';
import { isFunction, isObject } from 'lodash';
import debug from 'debug';
import path from 'path';

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').default;
const rootdir = process.cwd();

/**
 * Requires a script located at 'scriptPath'.
 * @param  {String}  scriptPath  Relative path of file to require().
 */
export default async function run(scriptPath) {
  scriptPath = scriptPath || 'index';

  try {
    const nest = createNest(rootdir);
    let func = require(path.join(rootdir, scriptPath));

    if (isObject(func) && isFunction(func.default)) {
      func = func.default;
    }

    invariant(isFunction(func), 'Script must export a function');

    await func(nest);

    console.log('Script ' + scriptPath + ' finished');

  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }
}
