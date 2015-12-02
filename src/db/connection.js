import mongoose from 'mongoose';
import config from '../../config';

mongoose.Promise = global.Promise;

/**
 * Creates a connection to the Mongo database.
 * @exports {Object}  Mongo connection
 */
const { host, port, db, user, pass } = config.mongo;
const authString = user ? `${user}:${pass}@` : '';

mongoose.connect(`mongodb://${authString}${host}:${port || 27017}/${db}`);

export default mongoose.connection;
