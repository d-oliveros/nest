var Route = require('../../lib/route');
var removeDiacritics = require('diacritic').clean;

var route = new Route({
	provider: 'reporteindigo',
	name:     'post',
	url:      'http://www.reporteindigo.com/<%= query %>',
	dynamic:  false,
	priority: 90,

	test: {
		query: 'reporte/mexico/paseo-de-las-carpas',
		shouldCreateItems:  true,
		shouldSpawnOperations: false,
	}
});

route.scraper = function($) {

	// The scraping function will return this object to Nest. Nest will then:
	// - Scrape the next page is 'hasNextPage' is true,
	// - Save the items in the 'data.items' array into a Mongo DB
	// - Scrape the new routes inside 'data.operations',
	var data = {
		items: [],
	};
	var itemUrl = this.location.href;
	var itemAuthor = $('.article-author').text();

	data.items.push({
		url:       itemUrl,
		key:       itemUrl.replace('http://www.reporteindigo.com/', ''),
		name:      $('#article-title').text(),
		abstract:  $('#article-abstract').text(),
		body:      $('#rest-body').text(),
		posted:    new Date( $('.article-date').text().replace(/de /g, '') ),
		tag:       $('#article-topic .topic').text().substr(1),
		image:     $('#article-multimedia img').attr('src'),

		// If the author is set, remove extra text
		authors: itemAuthor ? 
			itemAuthor.replace('Por ', '').replace(' -', '').split(', ') :
			undefined,

	});

	return data;
};

// This will be executed before saving the items to the DB.
// You can use any module here, as this is executed in the main NodeJS process
route.middleware = function(data, callback) {

	// We dont want accents in the tag names, so we are removing them here
	data.items.forEach( function(item) {
		item.tag = removeDiacritics(item.tag);
	});

	callback(null, data);
};

module.exports = route;
