const debug = require('debug');

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

const Nest = require('../index');

const rootdir = process.cwd();

/**
 * Starts processing the queue.
 */
module.exports = function workCommand() {
  const nest = new Nest(rootdir);
  nest.engine.start();
};
