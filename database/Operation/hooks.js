
module.exports = function(schema) {
	schema.pre('save', function(next) {
		this.wasNew = this.isNew;
		next();
	});
};
