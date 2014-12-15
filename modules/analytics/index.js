var Mixpanel = require('mixpanel');
var mixpanel;

var noop = function(){};

// Set mixpanel up
if ( __config.mixpanel ) {
	mixpanel = Mixpanel.init(__config.mixpanel);
} else {
	mixpanel = { 
		track: noop 
	};
}

exports.track = function(event, data, callback) {
	callback = callback || noop;

	// Disabling all the events except the "Profile Created event"
	if ( event === 'Profile Created' ) {
		mixpanel.track(event, data, callback);
	}
};

exports.register = function(user, callback) {
	console.log('Mixpanel register:');
	console.log(user);
	callback();
};
