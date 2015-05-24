// Make sure the database is initialized
require('../../database');

import mongoose from 'mongoose';
import modelSchema from './schema';

export default mongoose.model('Item', modelSchema);
