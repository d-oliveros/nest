
global.__base       = __dirname;
global.__env        = process.env.NODE_ENV || 'local';

global.__config     = require('./config');
global.__database   = __base+'/database';
global.__framework  = __base+'/framework';
global.__interface  = __base+'/interface';
global.__routes     = __base+'/routes';
global.__test       = __base+'/test';
