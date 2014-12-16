var _ = require('lodash');

exports.getProvider = function(route) {
	return _.findWhere(this.providers, {
		name: route.domain,
	});
};

exports.updateProvider = function(route, locals) {
	var prevProvider = this.getProvider(route);

	var newProvider = {
		name:     route.domain,
		route:    route.name,
		priority: route.priority,
	};

	_.extend(newProvider, locals);

	// Create the provider if it doesn't exist
	if ( !prevProvider ) {
		this.providers.push(newProvider);
	}

	// Update the provider if it did exist
	else if ( prevProvider.priority <= newProvider.priority ) {
		_.assign(prevProvider, newProvider);
	}
};
