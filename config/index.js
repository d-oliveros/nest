import {assign} from 'lodash';
import fs from 'fs';

let env = process.env.NODE_ENV || 'local';
let envPath = fs.existsSync(`${__dirname}/environments/${env}.js`) ?
  `${__dirname}/environments/${env}` :
  `${__dirname}/environments/default.js`;

let config = {
	phantom: require('./phantom.config'),
	engine: require('./engine.config')
};

assign(config, require(envPath));

export default config;
