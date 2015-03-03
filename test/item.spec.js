process.env.NODE_ENV = 'test';

var _ = require('lodash');

var Item = require('../lib/models/Item');
var dummyItem = require('./data/profile.json');

describe('Item', function() {
	this.timeout(6000);

	describe('Model', function() {

		before( function(done) {
			Item.remove(done);
		});

		it('should create a new item', function(done) {
			Item.create(dummyItem, done);
		});

		it('should delete a item', function(done) {
			Item.remove({ key: dummyItem.key }, function(err, count) {
				if (err) return done(err);
				if (count === 0) return done( new Error('No items deleted'));
				done();
			});
		});
	});

	describe('Statics', function() {
		
		before( function(done) {
			Item.remove(done);
		});

		it('should insert a new item', function(done) {
			Item.upsert(dummyItem, function(err, op) {
				if (err) return done(err);

				if ( op !== 'created' ) {
					err = new Error('Item is not new');
					return done(err);
				}

				done();
			});
		});

		it('should update an existing item', function(done) {
			var newItem = _.extend( _.clone(dummyItem), {
				name: 'Name should have changed',
			});

			Item.upsert(newItem, function(err, op) {
				if (err) return done(err);

				if ( op !== 'updated' ) {
					err = new Error('Item is new');
					return done(err);
				}

				Item.remove(done);
			});
		});
	});
});
