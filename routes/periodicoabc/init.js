
// Exports: Scraping initialization script
//
// Starts extracting data from animalpolitico
// by searching the word "que", and spawning crawlers to the posts
// 
exports.start = function() {
	console.log('Initializing periodicoabc...');

	var newsRoute = require('./news');
	var engine = require('../../lib/engine');
	
	newsRoute.initialize(null, function() {
		engine.start();
	});
};
