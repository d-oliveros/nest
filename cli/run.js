import invariant from 'invariant';
import { isFunction, isObject } from 'lodash';
import debug from 'debug';
import path from 'path';

// enable Worker messages
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const createNest = require('../src/nest').createNest;
const rootdir = process.cwd();

export default async function run(script) {
  script = script || 'index';

  try {
    const nest = createNest(rootdir);
    let func = require(path.join(rootdir, script));

    if (isObject(func) && isFunction(func.default)) {
      func = func.default;
    }

    invariant(isFunction(func), 'Script must export a function');

    await func(nest);

    console.log('Script ' + script + ' finished');

  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }
}
