import winston, { Logger } from 'winston';
import debug from 'debug';
import path from 'path';

const logPath = path.resolve(__dirname, '..', 'nest.log');
const { NEST_LOG, NODE_ENV } = process.env;
const { Console, File } = winston.transports;

const transports = [
  new Console({
    level: 'info',
    colorize: true,
    timestamp: true
  })
];

if (NEST_LOG === 'true') {
  transports.push(new File({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    filename: logPath
  }));
}

const logger = new Logger({ transports });

logger.debug = (key) => {
  const debugMessage = debug(key);

  return (message, meta) => {
    const args = ['debug', `${key}: ${message}`];

    if (typeof meta !== 'undefined') {
      args.push(meta);
    }
    logger.log(...args);
    debugMessage(message);
  };
};

export default logger;
