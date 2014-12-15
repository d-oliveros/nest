var async = require('async');
var skills = require(__data+'/skills.list.json');

var githubSearchRoute = require(__routes+'/github/search');

module.exports = function(callback) {
	callback = callback || function(){};

	console.log('Starting createGithubOperations script');
	console.log(skills.length);

	async.eachLimit(skills, 10, function(skill, callback) {
		skill = skill.replace(/-/g, ' ');
		
		console.log('Creating operation for skill: '+skill);

		githubSearchRoute.initialize(skill, callback);
	}, function(err) {
		if (err) return console.error(err);
		console.log('Finished initiating the operations.');
		callback();
	});
};
