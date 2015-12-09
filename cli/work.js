/* eslint-disable vars-on-top */
/* eslint-disable no-var */
var debug = require('debug');
debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

var createNest = require('../lib/nest').default;
var rootdir = process.cwd();

module.exports = function workCommand() {
  createNest(rootdir).syndicate.start();
};
