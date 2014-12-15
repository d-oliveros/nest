
process.env.NODE_ENV = 'test';
//process.env.PHANTOM_LOG = 'true';

global.should = require('chai').should();
global.expect = require('chai').expect;

Error.stackTraceLimit = Infinity;

require('../globals');
require(__database);
