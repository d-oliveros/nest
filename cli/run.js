const assert = require('assert');
const debug = require('debug');
const path = require('path');
const Nest = require('../index');

const rootdir = process.cwd();

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

/**
 * Requires a script located at 'scriptPath'.
 * @param  {String}  scriptPath  Relative path of file to require().
 */
module.exports = function run(scriptPath) {
  scriptPath = scriptPath || 'index';

  const nest = new Nest(rootdir);
  let func = require(path.join(rootdir, scriptPath)); // eslint-disable-line

  if (typeof func === 'object' && typeof func.default === 'function') {
    func = func.default;
  }

  assert(typeof func === 'function', 'Script must export a function');

  func(nest)
    .then(() => {
      console.log(`Script ${scriptPath} finished`);
    })
    .catch((err) => {
      console.error(err.stack);
      process.exit(1);
    });
};
