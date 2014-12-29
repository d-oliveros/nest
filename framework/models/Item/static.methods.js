var _ = require('lodash');
var async = require('async');
var debug = require('debug')('Item:statics');

// Optimally, we would be able to do the upsert 
// operation atomically. Since we can't, we need to 
// make sure only one upsert operation is happening at any time
var upsertQueue = async.queue( function(task, callback) {
	task(callback);
}, 1);

exports.eachUpsert = function(items, route, callback) {
	var Item = this;

	var stats = {
		created: 0,
		updated: 0,
		ignored: 0,
		items: [],
	};

	async.eachSeries(items, function(item, cb) {
		Item.upsert(item, route, function(err, item, op) {
			if (err) return cb(err);
			if (item) {
				stats.items.push(item);
				stats[op === 'create' ? 'created' : 'updated']++;
			} else {
				stats.ignored++;
			}
			cb();
		});
	}, function(err) {
		callback(err, stats);
	});
};

exports.upsert = function(data, route, callback) {
	var op, isNew, Item;

	data = _.clone(data);
	Item = this;

	debug('Upsert: Finding Item for', data.key);

	upsertQueue.push( function(cb) {
		Item.findOne({ key: data.key }, function(err, item) {
			if (err) return cb(err);

			debug('Previous item', item);

			isNew = !!!item;

			if (isNew) {
				item = new Item(data);
			} else {
				_.assign(item, data);
			}

			item.updateProvider(route, data.local);

			debug('New Item', item);

			item.save(cb);
		});
	}, function(err, updatedItem) {
		if (err) {
			console.error(err);
			return callback();
		}

		updatedItem.wasNew = isNew;

		op = isNew ? 'create' : 'update';
		callback(null, updatedItem, op);
	});

};
