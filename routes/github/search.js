import createRoute from '../../src/route';
const _ = require('lodash');

const route = createRoute({
  provider: 'github',
  name:  'search',
  url:   'https://github.com/search?p=<%= state.currentPage %>&type=Users&q=<%= query %>',
  priority: 100,
  concurrency: 2,
  test: {
    query: 'nodejs',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {
  const data = {
    hasNextPage: $('a.next_page').length > 0,
    items: [],
    operations: []
  };

  // Remove new lines and trim
  const format = function(string) {
    let trimmed = '';
    string.split('\n').forEach(function(line) {
      if (line.trim().length) {
        trimmed = line.trim();
      }
    });
    return trimmed;
  };

  // Get the language filter selection
  const $selectedFilter = $('.codesearch-aside a.filter-item.selected');
  const selectedFilter = format($selectedFilter.clone().children().remove().end().text());

  // Get the active search query
  let searchQuery = $('input.input-block.js-search-query').attr('value');

  // For each user
  $('.user-list-item').each(function() {
    const $elem = $(this);
    const $meta = $elem.find('.user-list-meta');
    const $info = $elem.find('.user-list-info');
    const $location = $meta.find('.octicon-location').parent();
    const username = $info.find('a').attr('href').substr(1);

    // Create the user profile
    const profile = {
      name:  format($info.clone().children().remove().end().text()),
      key: $meta.find('.email').text() || null,
      type: 'user',
      link: `https://github.com/${username}`,

      username:   username,
      image:      $elem.find('img.avatar').attr('src'),
      joinedDate: $meta.find('.join-date').attr('datetime'),
      location:   format($location.clone().children().remove().end().text())
    };

    if (searchQuery) {
      profile.searchQuery = searchQuery;

      const parts = searchQuery.split(' ');

      // get the number of repos filter from the search query
      for (let i = 0, len = parts.length; i < len; i++) {
        searchQuery = parts[i];
        if (searchQuery.indexOf('repos:') > -1) {
          let repos = searchQuery.split(':')[1];

          if (!isNaN(repos)) {
            profile.repositoryCount = parseInt(repos, 10);
          } else {
            if (repos.indexOf('>') > -1) {
              repos = parseInt(repos.replace('>', ''), 10);

              if (!isNaN(repos)) {
                repos++;
              }

              profile.repositoryCount = repos;
            }
          }
        }
      }
    }

    if (selectedFilter) {
      profile.mainSkill = selectedFilter;
    }

    if (profile.key) {
      data.items.push(profile);
    }

    // Create operations to `profile` routes
    // Ej. Schedule the routes to be scraped later
    data.operations.push({
      provider: 'github',
      route: 'profile',
      query: profile.username
    });

  });

  return data;
};

route.checkStatus = function($) {
  let status = 'ok';

  $('h1').each(function() {
    const $h1 = $(this);

    if ($h1.text() === 'Whoa there!') {
      status = 'blocked';
    }
  });

  return status;
};

route.middleware = function(scraped) {
  const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  // remove the invalid emails from the scraped results
  scraped.items = _.filter(scraped.items, (item) => emailRegex.test(item.key));

  return scraped;
};

export default route;
