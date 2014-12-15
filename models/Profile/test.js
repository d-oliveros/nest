var _ = require('lodash');

var Profile = require('./index');
var dummyProfile = require(__test+'/data/dummy/profile.json');

describe('Profile', function() {

	describe('Model', function() {

		before( function(done) {
			Profile.remove(done);
		});

		it('should create a new profile', function(done) {
			Profile.create(dummyProfile, done);
		});

		it('should delete a profile', function(done) {
			Profile.remove({ email: dummyProfile.email }, function(err, count) {
				if (err) return done(err);
				if (count === 0) return done( new Error('No profiles deleted'));
				done();
			});
		});
	});

	describe('Statics:', function() {
		var githubSearchRoute = require(__routes+'/github/search');

		describe('`upsert`', function() {

			before( function(done) {
				Profile.remove(done);
			});

			it('should create a new profile', function(done) {
				Profile.upsert(dummyProfile, githubSearchRoute, function(err, profile) {
					if (err) return done(err);

					if (!profile.wasNew) {
						err = new Error('Profile is not new');
						return done(err);
					}

					var hasSameName  = profile.name  === dummyProfile.name;
					var hasSameEmail = profile.email === dummyProfile.email;

					if ( !hasSameName || !hasSameEmail ) {
						err = new Error('Profile is invalid');
						return done(err);	
					}

					done();
				});
			});

			it('should update an existing profile', function(done) {
				var newDummy = _.extend( _.clone(dummyProfile), {
					name: 'Name should have changed'
				});

				Profile.upsert(newDummy, githubSearchRoute, function(err, profile) {
					if (err) return done(err);

					if (profile.wasNew) {
						err = new Error('Profile was new');
						return done(err);
					}

					if ( profile.name === dummyProfile.name ) {
						err = new Error('Name did not change');
						return done(err);	
					}

					Profile.remove(done);
				});
			});
		});
	});
});
