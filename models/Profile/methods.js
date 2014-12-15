var _ = require('lodash');

exports.getProvider = function(name) {
	return _.findWhere(this.providers, {
		name: name
	});
};

exports.updateProvider = function(route, locals) {
	var prevProvider = this.getProvider(route.engine);

	var newProvider = {
		name:   route.engine,
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
