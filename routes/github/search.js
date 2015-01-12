var Route = require('../../lib/route');
var _ = require('lodash');

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

// This function is executed in the PhantomJS context
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
		var $elem, $meta, $info, $location, 
			link, profile, username, parts, repos;

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

			parts = searchQuery.split(' ');

			// get the number of repos filter from the search query
			for (var i = 0, len = parts.length; i < len; i++) {
				searchQuery = parts[i];
				if ( searchQuery.indexOf('repos:') > -1 ) {
					repos = searchQuery.split(':')[1];

					if ( !isNaN(repos) ) {
						profile.repositoryCount = parseInt(repos);
					}  else {
						if ( repos.indexOf('>') > -1 ) {
							repos = parseInt(repos.replace('>', ''));

							if ( !isNaN(repos) ) {
								repos++;
							}
							
							profile.repositoryCount = repos;
						}
					}
				}
			}
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
	var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

	// remove the invalid emails from the scraped results
	scraped.items = _.filter(scraped.items, function(item) {
		return emailRegex.test(item.key);
	});

	callback(null, scraped);
};

module.exports = route;
