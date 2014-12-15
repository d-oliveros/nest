var _ = require('lodash');
var async = require('async');
var debug = require('debug')('Profile:statics');
var analytics = require(__modules+'/analytics');

exports.eachUpsert = function(profiles, route, callback) {
	var Profile = this;

	var data = {
		created: 0,
		updated: 0,
		ignored: 0,
		profiles: [],
	};

	async.eachSeries(profiles, function(profile, cb) {
		Profile.upsert(profile, route, function(err, profile, op) {
			if (err) return cb(err);
			if (profile) {
				data.profiles.push(profile);
				data[op === 'create' ? 'created' : 'updated']++;
			} else {
				data.ignored++;
			}
			cb();
		});
	}, function(err) {
		callback(err, data);
	});
};

// Optimally, we would be able to do the upsert operation atomically
// since we can't, we need to make sure only one upsert operation is happening at any time
var upsertQueue = async.queue( function(task, callback) {
	task(callback);
}, 1);

exports.upsert = function(profile, route, callback) {
	var op, isNew, analyticsKey, analyticsData, scrapedProfile, Profile;

	scrapedProfile = _.clone(profile);
	Profile = this;
	
	debug('Upsert: Finding profile for', scrapedProfile.email);

	upsertQueue.push( function(cb) {
		Profile.findOne({ email: scrapedProfile.email }, function(err, profile) {
			if (err) return cb(err);

			debug('Previous profile', profile);

			isNew = !!!profile;
			analyticsKey = 'Profile Created'; 

			if (isNew) {
				console.log('Creating a new profile: '+scrapedProfile.email);
				profile = new Profile(scrapedProfile);
			} else {
				_.assign(profile, scrapedProfile);
				analyticsKey = 'Profile Updated'; 
			}

			analyticsData = {
				'Profile ID':    profile._id.toString(),
				'Route Name':    route.name,
				'Profile Name':  profile.name,
				'Profile Email': profile.email,
			};

			profile.updateProvider(route, scrapedProfile.local);
			analytics.track(analyticsKey, analyticsData);

			debug('New profile', profile);

			profile.save(cb);
		});
	}, function(err, updatedProfile) {
		if (err) {
			console.error(err);
			return callback();
		}

		updatedProfile.wasNew = isNew;

		op = isNew ? 'create' : 'update';
		callback(null, updatedProfile, op);
	});

};
