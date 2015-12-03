import mongoose from 'mongoose';
import config from '../../config';
import logger from '../logger';

mongoose.Promise = global.Promise;

/**
 * Creates a connection to the Mongo database.
 * @exports {Object}  Mongo connection
 */
const { host, port, db, user, pass } = config.mongo;
const authString = user ? `${user}:${pass}@` : '';

try {
  mongoose.connect(`mongodb://${authString}${host}:${port || 27017}/${db}`);
} catch (err) {
  console.error(err.stack);
}

mongoose.connection.on('error', (err) => {
  logger.error(err);
});

/**
 * @providesModule MongoConnection
 */
export default mongoose.connection;
