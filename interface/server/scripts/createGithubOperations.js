var async = require('async');
var skills = require(__data+'/skills.list.json');

var Operation = require(__models+'/Operation');

module.exports = function() {
	async.eachSeries(skills, function(skill, callback) {
		Operation.findOrCreate({
			routeName: 'github:search',
			query: skill.replace(/-/g, ' '),
		}, callback);
	}, console.error.bind(console));
};
