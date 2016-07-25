const debug = require('debug');

debug.enable('nest:worker*');
debug.enable('nest:spider*');
debug.enable('nest:item*');

module.exports = require('./lib/nest').default;
