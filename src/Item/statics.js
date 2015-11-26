import logger from '../logger';

const debug = logger.debug('Item:statics');

/**
 * Applies `Item.upsert` to `items` in parallel
 * @param  {Array}  items  Items to upsert
 * @return {Object}        Object with operation stats
 */

export const eachUpsert = async function(items) {
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
};

/**
 * Creates or updates a scraped item in the database
 * @param  {Object}  item  The item to be upserted
 * @return {String}        Operation type. Either 'created' or 'updated'.
 */
export const upsert = async function(item) {
  debug(`Upsert: Finding Item ${item.key}`);

  const query = { key: item.key };
  const options = { upsert: true };

  const updated = await this.update(query, item, options).exec();
  const isNew = !updated.nModified;
  const op = isNew ? 'created' : 'updated';

  debug((isNew ? 'Created item:' : 'Updated item:') + ` ${item.key}`);

  return op;
};
