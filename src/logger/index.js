import {Logger} from 'winston';
import debug from 'debug';

import {levels, colors} from './config';
import transports from './transports';

// Exports: logger
//
let logger = new Logger({ transports, levels, colors });

// Overriding: winston.Logger.debug
//
logger.debug = (key) => {
  let debugMessage = debug(key);

  return (message, meta) => {
    logger.log('debug', `${key}: ${message}`, meta);
    debugMessage(message);
  };
};

export default logger;
