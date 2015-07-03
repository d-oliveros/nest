var Route = require('../../src/Route');

var route = new Route({
  provider: 'reddit',
  name:  'post',
  url:   'http://www.reddit.com/<%= query %>',
  priority: 100,
  test: {
    query: '27kpz9',
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  var data = {
    hasNextPage: false,
    items: []
  };

  var $post       = $('.linklisting div.thing');
  var $title      = $post.find('a.title');
  var id          = $post.data('fullname').split('_')[1].trim();
  var title       = $title.text().trim();
  var pathname    = this.location.href.replace('http://www.reddit.com', '');
  var description = $post.find('div.usertext-body p').text().trim();
  var upvotes     = $post.find('div.score.unvoted').text().trim();
  var subreddit   = pathname.split('/')[2];

  var comments    = [];

  // get the post comments
  $('.nestedlisting div.thing').each(function() {
    var $comment = $(this);
    var commentBody = $comment.find('.usertext-body p').text();
    var author = $('.tagline .author').text();

    comments.push({
      body: commentBody,
      author: author
    });
  });

  data.items.push({
    name: title,
    key: id,
    link: 'http://www.reddit.com/'+id,

    description: description,
    upvotes: upvotes,
    subreddit: subreddit,
    comments: comments
  });

  return data;
};

module.exports = route;
