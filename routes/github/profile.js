var Route = require(__modules+'/Route');

var route = new Route({
	title: 'Profile Page',
	name:  'github:profile',
	url:   'https://github.com/<%- query %>',
	priority: 100,
	test: {
		query: 'isaacs',
		shouldCreateProfiles:  true,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data, username, profile;

	function getText($elem) {
		return $elem.clone().children().remove().end().text();
	}

	data = {
		profiles: [],
		operations: [],
	};

	username = $('.vcard-username').text();

	// Create the user profile
	profile = {
		name:  $('.vcard-fullname').text(),
		email: $('a.email').text().trim().toLowerCase(),
		image: $('img.avatar').attr('src'),

		local: {
			link: 'https://github.com/'+username,
			username: username,
			data: {
				location: getText($('.octicon-location').parent()),
				organization: getText($('.octicon-organization').parent()),
				joinedDate: $('time.join-date').text(),
				repositories: [],
				forks: [],
			},
		}
	};

	// Get the user's metadata (followers, stars, etc)
	$('.text-muted').each( function() {
		var key, value;

		key   = $(this).text().toLowerCase();
		value = $(this).parent().find('.vcard-stat-count').text();

		// Transforms ej. 3.3k to 3300
		if ( value.toLowerCase()[value.length-1] === 'k' ) {
			value = value.slice(0, -1);
			value = value*1000;
		}

		value = parseInt(value);

		switch(key) {
			case 'followers':
				profile.local.data.followers = value;
				break;

			case 'following':
				profile.local.data.following = value;
				break;

			case 'starred':
				profile.local.data.starred = value;
				break;
		}
	});

	// Get the user's repositories and forks
	$('.mini-repo-list-item').each( function() {
		var isOwn, repository;

		isOwn = !!$(this).find('.octicon-repo').length;
		repository = {
			name: $(this).find('.repo').text(),
			stars: parseInt( getText($(this).find('.stars')) ),
			link: 'https://github.com'+$(this).attr('href'),
			teaser: $(this).find('.repo-description').text(),
		};
		
		if (isOwn) {
			profile.local.data.repositories.push(repository);
		} else {
			profile.local.data.forks.push(repository);
		}
	});

	if ( profile.email ) {
		data.profiles.push(profile);
	}

	// Create operations to the `following` and `followers` routes
	if ( profile.local.data.followers ) {
		data.operations.push({
			routeName: 'github:followers',
			query: username,
		});
	}

	if ( profile.local.data.following ) {
		data.operations.push({
			routeName: 'github:following',
			query: username,
		});
	}

	return data;
};

module.exports = route;
