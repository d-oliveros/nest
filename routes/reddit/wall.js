import createRoute from '../../src/route';

const routeURL =
  'http://www.reddit.com/r/<%= query %>/new/' +
    '?count=<%= ((state.currentPage-1) * 25) %>' +
    '<% if (state.data.lastId) {%>' +
      '&after=t3_<%= state.data.lastId %>' +
    '<% } %>';

const route = createRoute({
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
  const $posts = $('#siteTable div.thing');

  const data = {
    hasNextPage: !!$('.nav-buttons a[rel="nofollow next"]').length,
    items: [],
    operations: [],
    state: {}
  };

  const pathname = this.location.href.replace('http://www.reddit.com', '');

  $posts.each(function() {
    const $post = $(this);
    const $title = $post.find('a.title');
    const id = $post.data('fullname').split('_')[1].trim();
    const title = $title.text().trim();
    const upvotes = $post.find('div.score.unvoted').text().trim();
    const subreddit = pathname.split('/')[2];

    data.items.push({
      name: title,
      key: id,
      link: `http://www.reddit.com/${id}`,
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

export default route;
