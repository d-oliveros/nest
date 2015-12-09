/* eslint-disable vars-on-top */
/* eslint-disable no-var */
var invariant = require('invariant');
var debug = require('debug');
var path = require('path');

// enable Worker messages
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

var createNest = require('../src/nest').default;
var rootdir = process.cwd();

module.exports = function runCommand(script) {
  script = script || 'index';

  try {
    var nest = createNest(rootdir);
    var func = require(path.join(rootdir, script));

    if (typeof func === 'object' && typeof func.default === 'function') {
      func = func.default;
    }

    invariant(typeof func === 'function', 'Script must export a function');

    func(nest)
      .then(function() {
        console.log('Script ' + script + ' finished');
      });
  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }
};
