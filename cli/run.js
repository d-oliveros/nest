import invariant from 'invariant';
import { isFunction, isObject } from 'lodash';
import debug from 'debug';
import path from 'path';

// enable Worker messages
debug.enable('Worker');
debug.enable('Spider*');
debug.enable('Item*');

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

    const res = func(nest);
    const promise = isPromise(res) ? res : Promise.resolve(res);

    await promise;

    console.log('Script ' + script + ' finished');
    process.exit(0);

  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }
}

function isPromise(obj) {
  return isObject(obj) && isFunction(obj.then);
}
