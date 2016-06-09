/* eslint-disable no-var */
var noop = require('lodash').noop;

var phantomConfig = [
  '--load-images=no',
  '--ignore-ssl-errors=yes'
];

module.exports = phantomConfig;
