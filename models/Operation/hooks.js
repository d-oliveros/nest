var analytics = require(__modules+'/analytics');

module.exports = function(schema) {
	schema.pre('save', function(next) {
		this.wasNew = this.isNew;
		next();
	});

	schema.post('save', function(doc) {
		var data = {
			'Route': doc.route,
			'Current Page': doc.state.currentPage,
			'Query': doc.query,
			'Operation ID': doc._id.toString(),
		};

		if ( doc.state.finished ) {
			data.Finished = doc.state.finished;
		}

		if ( doc.state.started ) {
			data.Started = doc.state.started;
		}

		var analyticsKey = doc.wasNew ? 
			'Operation Created' : 
			'Operation Updated';

		analytics.track(analyticsKey, data);
	});
};
