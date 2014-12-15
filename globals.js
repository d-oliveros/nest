
global.__base       = __dirname;
global.__env        = process.env.NODE_ENV || 'local';
global.__config     = require('./config');
global.__modules    = __base+'/modules';
global.__models     = __base+'/models';
global.__routes     = __base+'/routes';
global.__database   = __base+'/database';
global.__interface  = __base+'/interface';
global.__data       = __base+'/data';
global.__test       = __base+'/test';
