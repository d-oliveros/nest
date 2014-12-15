var Route = require(__modules+'/Route');

var route = new Route({
	title: 'Search Results',
	name:  'github:search',
	url:   'https://github.com/search?q=<%- query %>&p=<%= state.currentPage %>&type=Users',
	priority: 80,
	test: {
		query: 'nodejs',
		shouldCreateProfiles:  true,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {

	var data = {
		hasNextPage: !!$('.next_page').attr('href'),
		profiles: [],
		operations: [],
	};

	// For each user
	$('.user-list-item').each(function() {
		var $elem, $meta, $info, $location, link, profile;

		$elem = $(this);
		$meta = $elem.find('.user-list-meta');
		$info = $elem.find('.user-list-info');
		$location = $meta.find('.octicon-location').parent();

		link = $info.find('a').attr('href') ?
			'https://github.com'+$info.find('a').attr('href') :
			null;

		// Create the user profile
		profile = {
			name:  format($info.clone().children().remove().end().text()),
			email: $meta.find('.email').text() || null,
			image: $elem.find('img.avatar').attr('src'),

			local: {
				username:   $info.find('a').attr('href').substr(1),
				link: link,
				data: {
					joinedDate: $meta.find('.join-date').attr('datetime'),
					location:   format($location.clone().children().remove().end().text()),
				},
			}
		};

		if ( profile.email ) {
			data.profiles.push(profile);
		}

		// Create operations to `profile` routes
		// Ej. Schedule the routes to be scraped later
		data.operations.push({
			routeName: 'github:profile',
			query: profile.local.username,
		});

	});

	// Remove new lines and trim
	function format(string) {
		var trimmed = '';
		string.split('\n').forEach( function(line) {
			if (line.trim().length) {
				trimmed = line.trim();
			}
		});
		return trimmed;
	}

	return data;
};

module.exports = route;
