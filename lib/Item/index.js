// Make sure the database is initialized
require('../database');

import mongoose from 'mongoose';
import schema from './schema';

export default mongoose.model('Item', schema);
