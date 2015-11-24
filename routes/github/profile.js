import Route from '../../src/Route';
const _ = require('lodash');

const route = new Route({
  provider: 'github',
  name:  'profile',
  url:   'https://github.com/<%- query %>',
  priority: 80,
  test: {
    query: 'isaacs',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {
  const data = {
    items: [],
    operations: []
  };

  const getText = function($elem) {
    return $elem.clone().children().remove().end().text().trim();
  };

  const username = $('.vcard-username').text();
  const email = $('a.email').text().trim().toLowerCase();

  // create the user profile
  const profile = {
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
    forks: []
  };

  // get the user's metadata (followers, stars, etc)
  $('.text-muted').each(function() {
    const key = $(this).text().toLowerCase();
    let value = $(this).parent().find('.vcard-stat-count').text();

    // transforms ej. 3.3k to 3300
    if (value.toLowerCase()[value.length - 1] === 'k') {
      value = value.slice(0, -1);
      value = value * 1000;
    }

    value = parseInt(value, 10);

    switch (key) {
      case 'followers':
        profile.followers = value;
        break;

      case 'following':
        profile.following = value;
        break;

      case 'starred':
        profile.starred = value;
        break;

      default:
    }
  });

  // get the user's repositories and forks
  $('.mini-repo-list-item').each(function() {
    const isOwn = !!$(this).find('.octicon-repo').length;
    const repository = {
      name: $(this).find('.repo').text(),
      stars: parseInt(getText($(this).find('.stars')), 10),
      link: 'https://github.com' + $(this).attr('href'),
      teaser: $(this).find('.repo-description').text()
    };

    if (isOwn) {
      profile.repositories.push(repository);
    } else {
      profile.forks.push(repository);
    }
  });

  // save this profile in the db
  if (profile.key) {
    data.items.push(profile);
  }

  // create operations to the `following` and `followers` routes
  if (profile.followers) {
    data.operations.push({
      provider: 'github',
      route: 'followers',
      query: username
    });
  }

  if (profile.following) {
    data.operations.push({
      provider: 'github',
      route: 'following',
      query: username
    });
  }

  return data;
};


// Route Middleware
//
route.middleware = function(scraped, callback) {
  const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  // remove the invalid emails from the scraped results
  scraped.items = _.filter(scraped.items, function(item) {
    return emailRegex.test(item.key);
  });

  callback(null, scraped);
};

export default route;
