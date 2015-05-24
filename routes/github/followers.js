var Route = require('../../lib/route');

var route = new Route({
  provider: 'github',
  name:  'followers',
  url:   'https://github.com/<%- query %>/followers?page=<%= state.currentPage %>',
  priority: 50,

  test: {
    query: 'torvalds',
    shouldCreateItems:  false,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {
  var data = {
    operations: []
  };

  // Get all the usernames in this page
  $('.follow-list-item').each(function() {
    data.operations.push({
      provider: 'github',
      route: 'profile',
      query: $(this).find('.gravatar').parent().attr('href').substr(1)
    });
  });

  var hasPagination = $('.paginate-container').find('a').length > 0;
  if (hasPagination)
    data.hasNextPage = $('.paginate-container').find('.pagination').children().last().text() === 'Next';

  return data;
};

module.exports = route;
