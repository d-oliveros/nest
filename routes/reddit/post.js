import Route from '../../src/Route';

const route = new Route({
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
  const data = {
    hasNextPage: false,
    items: []
  };

  const $post = $('.linklisting div.thing');
  const $title = $post.find('a.title');
  const id = $post.data('fullname').split('_')[1].trim();
  const title = $title.text().trim();
  const pathname = this.location.href.replace('http://www.reddit.com', '');
  const description = $post.find('div.usertext-body p').text().trim();
  const upvotes = $post.find('div.score.unvoted').text().trim();
  const subreddit = pathname.split('/')[2];
  const comments = [];

  // get the post comments
  $('.nestedlisting div.thing').each(function() {
    const $comment = $(this);
    const commentBody = $comment.find('.usertext-body p').text();
    const author = $('.tagline .author').text();

    comments.push({
      body: commentBody,
      author: author
    });
  });

  data.items.push({
    name: title,
    key: id,
    link: 'http://www.reddit.com/' + id,

    description: description,
    upvotes: upvotes,
    subreddit: subreddit,
    comments: comments
  });

  return data;
};

export default route;
