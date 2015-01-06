var Route = require('../../framework/route');

var route = new Route({
	provider: 'github',
	name:  'search',
	url:   'https://github.com/search?p=<%= state.currentPage %>&type=Users&q=<%= query %>',
	priority: 80,
	test: {
		query: 'nodejs',
		shouldCreateItems:  true,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		hasNextPage: $('a.next_page').length > 0,
		items: [],
		operations: [],
	};

	// Remove new lines and trim
	var format = function (string) {
		var trimmed = '';
		string.split('\n').forEach( function(line) {
			if (line.trim().length) {
				trimmed = line.trim();
			}
		});
		return trimmed;
	};

	// Get the language filter selection
	var $selectedFilter = $('.codesearch-aside a.filter-item.selected');
	var selectedFilter = format( $selectedFilter.clone().children().remove().end().text() );

	// Get the active search query
	var searchQuery = $('input.input-block.js-search-query').attr('value');

	// For each user
	$('.user-list-item').each(function() {
		var $elem, $meta, $info, $location, link, profile, username;

		$elem = $(this);
		$meta = $elem.find('.user-list-meta');
		$info = $elem.find('.user-list-info');
		$location = $meta.find('.octicon-location').parent();

		username = $info.find('a').attr('href').substr(1);
		
		link = $info.find('a').attr('href') ?
			'https://github.com'+$info.find('a').attr('href') :
			null;

		// Create the user profile
		profile = {
			name:  format($info.clone().children().remove().end().text()),
			key: $meta.find('.email').text() || null,
			type: 'user',
			link: 'https://github.com/'+username,

			username:   username,
			image:      $elem.find('img.avatar').attr('src'),
			joinedDate: $meta.find('.join-date').attr('datetime'),
			location:   format($location.clone().children().remove().end().text()),
		};

		if ( searchQuery ) {
			profile.searchQuery = searchQuery;
		}

		if ( selectedFilter ) {
			profile.mainSkill = selectedFilter;
		}

		if ( profile.key ) {
			data.items.push(profile);
		}

		// Create operations to `profile` routes
		// Ej. Schedule the routes to be scraped later
		data.operations.push({
			provider: 'github',
			route: 'profile',
			query: profile.username,
		});

	});

	return data;
};

route.checkStatus = function() {
	var status = 'ok';

	$('h1').each( function() {
		var $h1 = $(this);

		if ( $h1.text() === 'Whoa there!' ) {
			status = 'blocked';
		}
	});

	return status;
};

route.middleware = function(scraped, callback) {
	var item, parts, searchQuery, repos;

	// track the number of repositories
	// todo: this is ugly
	if ( scraped.items.length ) {
		for (var i = 0, len = scraped.items.length; i < len; i++) {
			item = scraped.items[i];
			if ( item.local && item.local.data && item.local.data.searchQuery ) {
				parts = item.local.data.searchQuery.split(' ');

				// get the number of repos filter from the search query
				for (var j = 0, jLen = parts.length; j < jLen; j++) {
					searchQuery = parts[j];
					if ( searchQuery.indexOf('repos:') > -1 ) {
						repos = searchQuery.split(':')[1];

						if ( !isNaN(repos) ) {
							repos = parseInt(repos);
						}  else {
							if ( repos.indexOf('>') > -1 ) {
								repos = parseInt(repos.replace('>', ''));

								if ( !isNaN(repos) ) {
									repos++;
								}
							}
						}
						if ( !isNaN(repos) ) {
							item.local.data.repositoryCount = repos;
						}
					}
				}
			}
		}
	}

	callback(null, scraped);
};


module.exports = route;
