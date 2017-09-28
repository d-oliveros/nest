import mongoose from 'mongoose';
import logger from '../logger';


mongoose.Promise = global.Promise;

const isTest = process.env.NODE_ENV === 'test';

const defaultConfig = {
  db: isTest ? 'nest_test' : 'nest',
  host: '127.0.0.1',
  port: '27017',
  user: null,
  pass: null,
  replicaSet: null,
};

let _activeMongoConnection;

/**
 * Creates a connection to the Mongo database. If a connection was
 * previously made, the same mongo connection will be returned.
 *
 * @exports {Object} Mongo connection
 */
export default function createMongoConnection(config = {}) {
  if (_activeMongoConnection) {
    return _activeMongoConnection;
  }

  config = Object.assign({}, defaultConfig, config);

  const { db, host, port, user, pass, replicaSet } = config;

  // Connect mongo to a replica set, if available
  if (replicaSet) {
    mongoose.connect(replicaSet.uri, replicaSet.options, (err) => {
      if (err) {
        console.error(err.stack);
        process.exit(1);
      }
    });
  }
  else { // Or, connect mongo to a standalone instance
    const authString = user ? `${user}:${pass}@` : '';
    mongoose.connect(`mongodb://${authString}${host}:${port}/${db}`);
  }

  _activeMongoConnection = mongoose.connection;

  _activeMongoConnection.on('error', (error) => {
    logger.error(error);
  });

  _activeMongoConnection.on('close', () => {
    _activeMongoConnection = undefined;
  });

  return _activeMongoConnection;
}
