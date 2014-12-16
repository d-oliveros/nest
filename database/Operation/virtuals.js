module.exports = function(schema) {
	schema.virtual('routeDomain').get( function() {
		var routeDomain = this.routeName.split(':')[0];
		return require(__routes)[routeDomain];
	});

	schema.virtual('route').get( function() {
		var targetRoute = this.routeName.split(':')[1];
		return this.routeDomain[targetRoute];
	});

	return schema;
};
