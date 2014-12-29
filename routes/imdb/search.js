var Route = require(__framework).Route;

var route = new Route({
	title: 'Search',
	name:  'imdb:search',
	url:   'http://www.imdb.com/search/title?at=0&count=100&sort=num_votes&start=<%= (1 +((state.currentPage-1) * 100)) %>&title_type=feature,tv_movie',
	priority: 80,
	test: {
		shouldCreateItems:  true,
		shouldSpawnOperations: false,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		hasNextPage: $('.pagination a').length > 0,
		items: [],
		operations: [],
	};

	var $items = $('table.results tr');

	$items.each( function() {
		var $item = $(this);
		var item  = {};

		// Get the movie ID
		$item.find('.title a').each( function() {
			var href = $(this).attr('href');

			if ( href && href.indexOf('/title/') === 0 ) {
				item.name = $(this).text();
				item.key = href.replace(/(\/)(title)?/g, '');
			}
		});

		item.local = {
			link: 'http://www.imdb.com/title/'+item.key,
			data: {},
		};

		// Get the director
		var hasDirector = $item.find('.credit').text().indexOf('Dir') > -1;
		var $director  = $item.find('.credit a').first();

		if ( hasDirector ) {
			item.local.data.directorId   = $director.attr('href').replace(/(\/)(name)?/g, '');
			item.local.data.directorName = $director.text();
		}

		// Get metadata
		item.local.data.year = $item.find('.year_type').text().replace('(', '').replace(')', '');
		item.local.data.rating = $item.find('.rating-rating .value').text();
		item.local.data.outline = $item.find('.outline').text().trim();

		item.local.data.userRatings = $item.find('.sort_col').text().replace(/,/g, '');

		item.local.data.genres = $item.find('.genre a').map( function() {
			return $(this).attr('href').replace('/genre/', '');
		}).get();

		if ( item.key ) {
			data.items.push(item);
		}
	});

	return data;
};

module.exports = route;
