import async from 'async';
import _log from '../../logger';

let debug = _log.debug('Item:statics');

export default { eachUpsert, upsert };

// Applies `Item.upsert` to `items` in series,
// returns an object with operation stats
function eachUpsert(items, callback) {
  let stats = {
    created: 0,
    updated: 0,
    ignored: 0
  };

  async.each(items, (item, cb) => {
    this.upsert(item, (err, op) => {
      if (err) return cb(err);
      stats[op]++;
      cb();
    });
  }, (err) => callback(err, stats));
}

function upsert(data, callback) {
  debug(`Upsert: Finding Item ${data.key}`);

  this
    .update({ key: data.key }, data, { upsert: true })
    .exec((err, updated, n) => {
      let isNew = !n.updatedExisting;
      let op    = isNew ? 'created' : 'updated';

      if (err) {
        console.error(err);
        return callback(null, 'ignored');
      }

      debug((isNew ? 'Created item:' : 'Updated item:') + ` ${data.key}`);

      callback(null, op);
    });
}
