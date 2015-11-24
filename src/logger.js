import winston, { Logger } from 'winston';
import debug from 'debug';
import path from 'path';

const logPath = path.resolve(__dirname, '..', '..', 'nest.log');
const { NEST_LOG, NODE_ENV } = process.env;
const { Console, File } = winston.transports;

const levels = {
  verbose: 1,
  debug: 2,
  info: 3,
  event: 4,
  warn: 5,
  error: 6
};

const colors = {
  verbose: 'cyan',
  debug: 'blue',
  info: 'green',
  event: 'orange',
  warn: 'yellow',
  error: 'red'
};

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

const logger = new Logger({ transports, levels, colors });

logger.debug = (key) => {
  const debugMessage = debug(key);

  return (message, meta) => {
    logger.log('debug', `${key}: ${message}`, meta);
    debugMessage(message);
  };
};

export default logger;
