
exports.getAnalytics = function() {
	return {
		'Operation ID':       this._id.toString(),
		'Operation Route':    this.route,
		'Operation Query':    this.query,
	};
};
