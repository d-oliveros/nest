var Route = require('../../lib/route');
var removeDiacritics = require('diacritic').clean;

var route = new Route({
	provider: 'animalpolitico',
	name:     'search',
	url:      'http://www.animalpolitico.com/page/<%= state.currentPage %>/?s=<%= query %>',
	priority: 80,

	test: {
		query: 'dinero',
		shouldCreateItems:  true,
		shouldSpawnOperations: true,
	},
});

route.scraper = function($) {
	var data = {
		hasNextPage: $('.nextpostslink').length > 0,
		items: [],
		operations: [],
	};

	// We are mapping each search result to actual, valuable information,
	// and adding the search result to the items array
	data.items = $('#content article').map( function() {
		var $item = $(this);
		var itemUrl = $item.find('.entry-title a').attr('href');

		if ( itemUrl[itemUrl.length-1] === '/' )
			itemUrl = itemUrl.substr(0, itemUrl.length-1);

		return {
			name:  $item.find('.entry-title a').text(),
			key:   itemUrl.replace('http://www.animalpolitico.com/', ''),
			url:   itemUrl,
			image: $item.find('img.attachment-home-resumen-large').attr('src') || undefined,
		};
	}).get();

	data.operations = data.items.map( function(item) {
		return {
			provider: 'animalpolitico',
			route:    'post',
			query:    item.key,
		};
	});

	return data;
};

// This will be executed before saving the items to the DB.
// You can use any module here, as this is executed in the main NodeJS process
route.middleware = function(data, callback) {

	data.items.forEach( function(item) {

		// It would also be handy to save the title without accents
		item.nameSanitized = removeDiacritics(item.name);
	});

	callback(null, data);
};

module.exports = route;
