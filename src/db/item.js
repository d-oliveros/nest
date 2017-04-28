/* eslint-disable import/imports-first, array-callback-return */
import './connection';
import mongoose from 'mongoose';
import logger from '../logger';

const debug = logger.debug('nest:item');

/**
 * Schema
 */
const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },

  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  type: {
    type: String,
    default: 'content'
  },

  link: {
    type: String
  },

  routeId: {
    type: String,
    required: true
  },

  routeWeight: {
    type: Number,
    default: 50
  },

  created: {
    type: Date,
    default: Date.now
  }
}, { strict: false });

/**
 * Static Methods
 */
Object.assign(itemSchema.statics, {

  /**
   * Applies `Item.upsert` to `items` in parallel.
   * @param  {Array}  items  Items to upsert.
   * @return {Object}        Object with operation stats.
   */
  async eachUpsert(items) {
    const Item = this;
    const stats = {
      created: 0,
      updated: 0,
      ignored: 0
    };

    const promises = items.map(async (item) => {
      const op = await Item.upsert(item);
      stats[op]++;
    });

    await Promise.all(promises);

    return stats;
  },

  /**
   * Creates or updates a scraped item in the database.
   * @param  {Object}  item  The item to be upserted.
   * @return {String}        Operation type. Either 'created' or 'updated'.
   */
  async upsert(item) {
    debug(`Upsert: Finding Item ${item.key}`);

    const Item = this;
    const existItem = await Item.findOne({ key: item.key });

    if (existItem) {
      Object.assign(existItem, item);
      await existItem.save();

      debug(`'Updated item:' ${item.key}`);
      return 'updated';
    }

    await Item.create(item);

    debug(`Created item: ${item.key}`);
    return 'created';
  }
});

/**
 * Indexes
 */
itemSchema.index({ name: -1 });
itemSchema.index({ provider: -1 });
itemSchema.index({ 'providers.route': -1 });

/**
 * @providesModule Item
 */
export default mongoose.model('Item', itemSchema);
