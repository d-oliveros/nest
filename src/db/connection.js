import mongoose from 'mongoose';
import config from '../../config';
import logger from '../logger';

mongoose.Promise = global.Promise;

/**
 * Creates a connection to the Mongo database.
 * @exports {Object}  Mongo connection
 */
const { host, db, replicaSet } = config.mongo;

// Connect mongo to a replica set, if available
if (replicaSet) {
  mongoose.connect(replicaSet.uri, replicaSet.options, (err) => {
    if (err) {
      console.error(err.stack);
      process.exit(1);
    }
  });
} else { // Or, connect mongo to a standalone instance
  const { port, user, pass } = config.mongo;
  const authString = user ? `${user}:${pass}@` : '';

  mongoose.connect(`mongodb://${authString}${host}:${port || 27017}/${db}`);
}

mongoose.connection.on('error', (err) => {
  logger.error(err);
});

/**
 * @providesModule MongoConnection
 */
export default mongoose.connection;
