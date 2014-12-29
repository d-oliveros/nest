var Route = require(__framework+'/route');

var route = new Route({
	provider: 'github',
	name:  'profile',
	url:   'https://github.com/<%- query %>',
	priority: 100,
	test: {
		query: 'isaacs',
		shouldCreateItems:  true,
		shouldSpawnOperations: true,
	}
});

// this function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		items: [],
		operations: [],
	};
	
	var getText = function($elem) {
		return $elem.clone().children().remove().end().text().trim();
	};

	var username = $('.vcard-username').text();
	var email = $('a.email').text().trim().toLowerCase();

	// create the user profile
	var profile = {
		name:  $('.vcard-fullname').text(),
		type: 'user',
		key:   email,
		link: 'https://github.com/'+username,

		username: username,
		image: $('img.avatar').attr('src'),
		location: getText($('.octicon-location').parent()),
		organization: getText($('.octicon-organization').parent()),
		joinedDate: $('time.join-date').text(),
		repositories: [],
		forks: [],
	};

	// get the user's metadata (followers, stars, etc)
	$('.text-muted').each( function() {
		var key, value;

		key   = $(this).text().toLowerCase();
		value = $(this).parent().find('.vcard-stat-count').text();

		// transforms ej. 3.3k to 3300
		if ( value.toLowerCase()[value.length-1] === 'k' ) {
			value = value.slice(0, -1);
			value = value*1000;
		}

		value = parseInt(value);

		switch(key) {
			case 'followers':
				profile.followers = value;
				break;

			case 'following':
				profile.following = value;
				break;

			case 'starred':
				profile.starred = value;
				break;
		}
	});

	// get the user's repositories and forks
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
			profile.repositories.push(repository);
		} else {
			profile.forks.push(repository);
		}
	});

	if ( profile.key ) {
		data.items.push(profile);
	}

	// create operations to the `following` and `followers` routes
	if ( profile.followers ) {
		data.operations.push({
			provider: 'github',
			route: 'followers',
			query: username,
		});
	}

	if ( profile.following ) {
		data.operations.push({
			provider: 'github',
			route: 'following',
			query: username,
		});
	}

	return data;
};

module.exports = route;
