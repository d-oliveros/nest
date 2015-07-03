var Route = require('../../src/Route');

var routeURL =
  'http://www.reddit.com/r/<%= query %>/new/'+
    '?count=<%= ((state.currentPage-1) * 25) %>'+
    '<% if (state.data.lastId) {%>'+
      '&after=t3_<%= state.data.lastId %>'+
    '<% } %>';

var route = new Route({
  provider: 'reddit',
  name: 'wall',
  url: routeURL,
  priority: 80,
  test: {
    query: 'compsci',
    shouldCreateItems:  false,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {
  var $posts = $('#siteTable div.thing');

  var data = {
    hasNextPage: !!$('.nav-buttons a[rel="nofollow next"]').length,
    items: [],
    operations: [],
    state: {}
  };

  var pathname = this.location.href.replace('http://www.reddit.com', '');

  $posts.each(function() {
    var $post, $title, id, title, upvotes, subreddit;

    $post  = $(this);
    $title = $post.find('a.title');

    id        = $post.data('fullname').split('_')[1].trim();
    title     = $title.text().trim();
    upvotes   = $post.find('div.score.unvoted').text().trim();
    subreddit = pathname.split('/')[2];

    data.items.push({
      name: title,
      key: id,
      link: 'http://www.reddit.com/'+id,

      upvotes: upvotes,
      subreddit: subreddit
    });

    data.operations.push({
      provider: 'reddit',
      route: 'post',
      query: id
    });

    data.state.lastId = id;
  });

  return data;
};

module.exports = route;
