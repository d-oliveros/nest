var _ = require('lodash');

var Item = require('./index');
var dummyItem = require(__test+'/data/profile.json');

describe('Item', function() {

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
		var githubSearchRoute = require(__routes+'/github/search');

		describe('`upsert`', function() {
			before( function(done) {
				Item.remove(done);
			});

			it('should create a new item', function(done) {
				Item.upsert(dummyItem, githubSearchRoute, function(err, item) {
					if (err) return done(err);

					if (!item.wasNew) {
						err = new Error('Item is not new');
						return done(err);
					}

					var hasSameName  = item.name  === dummyItem.name;
					var hasSameEmail = item.email === dummyItem.email;

					if ( !hasSameName || !hasSameEmail ) {
						err = new Error('Item is invalid');
						return done(err);	
					}

					done();
				});
			});

			it('should update an existing item', function(done) {
				var newItem = _.extend( _.clone(dummyItem), {
					name: 'Name should have changed'
				});

				Item.upsert(newItem, githubSearchRoute, function(err, item) {
					if (err) return done(err);

					if (item.wasNew) {
						err = new Error('Item was new');
						return done(err);
					}

					if ( item.name === dummyItem.name ) {
						err = new Error('Name did not change');
						return done(err);	
					}

					Item.remove(done);
				});
			});
		});
	});
});
