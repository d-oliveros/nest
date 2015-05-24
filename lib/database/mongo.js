import mongoose from 'mongoose';
import config from '../../config';

let {host, port, db, user, pass} = config.mongo;
let authString = user ? `${user}:${pass}@` : '';

mongoose.connect(`mongodb://${authString}${host}:${port || 27017}/${db}`);

export default mongoose.connection;
