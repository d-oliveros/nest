import winston from 'winston';
import path from 'path';

let logPath = path.normalize(path.join(__dirname, '..', '..', 'nest.log'));
let {Console, File} = winston.transports;
let env = process.env;

let transports = [
  new Console({
    level: 'info',
    colorize: true,
    timestamp: true
  })
];

if (env.NEST_LOG === 'true') {
  transports.push(new File({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    filename: logPath
  }));
}

// Exports: logger transports
//
export default transports;
