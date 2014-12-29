var async = require('async');
var debug = require('debug')('Item:statics');

// Applies `Item.upsert` to `items` in series,
// returns an object with operation stats
exports.eachUpsert = function(items, callback) {
	var Item = this;

	var stats = {
		created: 0,
		updated: 0,
		ignored: 0,
	};

	async.each(items, function(item, cb) {
		Item.upsert(item, function(err, op) {
			if (err) return cb(err);
			stats[op]++;
			cb();
		});
	}, function(err) {
		callback(err, stats);
	});
};

exports.upsert = function(data, callback) {
	var Item = this;

	debug('Upsert: Finding Item ('+data.key+')');

	Item
		.update({ key: data.key }, data, { upsert: true })
		.exec( function(err, updated, n) {
			var isNew   = !n.updatedExisting;
			var op      = isNew ? 'created' : 'updated';

			if (err) {
				console.error(err);
				return callback(null, 'ignored');
			}

			debug( (isNew?'Created item:':'Updated item:')+' '+data.key+'.' );

			callback(null, op);
		});
};
