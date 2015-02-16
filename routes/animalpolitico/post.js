var Route = require('../../lib/route');

var route = new Route({
	provider: 'animalpolitico',
	name:     'post',
	url:      'http://www.animalpolitico.com/<%= query %>',
	dynamic:  false,
	priority: 90,

	test: {
		query: '2010/08/suprema-corte-avala-matrimonios-gay-en-el-df',
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
	//var posted = $('.entry-date').text().trim();

	// Clear the body
	$('.entry-content a').remove();
	$('.entry-content div').remove();

	var body = $('.entry-content p').map( function() {
		var $p = $(this);
		return $p.text().trim();
	}).get().join("\n");

	data.items.push({
		url:       itemUrl,
		key:       itemUrl.replace('http://www.animalpolitico.com/', ''),
		name:      $('.entry-title').text(),
		body:      body,
		//posted:    new Date( $('.article-date').text().replace(/de /g, '') ),
	});

	return data;
};

module.exports = route;
