var Route = require(__framework).Route;

var route = new Route({
	title: 'Reddit Post',
	name:  'reddit:post',
	url:   'http://www.reddit.com/<%= query %>',
	priority: 100,
	test: {
		query: '27kpz9',
		shouldCreateItems:  true,
		shouldSpawnOperations: false,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		hasNextPage: false,
		items: [],
	};

	var $post       = $('.linklisting div.thing');
	var $title      = $post.find('a.title');
	var id          = $post.data('fullname').split('_')[1].trim();
	var title       = $title.text().trim();
	var description = $post.find('div.usertext-body p').text().trim();
	var upvotes     = $post.find('div.score.unvoted').text().trim();
	var subreddit   = window.location.pathname.split('/')[2];

	var comments    = [];

	$('.nestedlisting div.thing').each( function() {
		var $comment = $(this);
		var commentBody = $comment.find('.usertext-body p').text();
		var author = $('.tagline .author').text();

		comments.push({
			body: commentBody,
			author: author,
		});
	});

	data.items.push({
		name: title,
		key: id,
		local: {
			link: 'http://www.reddit.com/'+id,
			data: {
				description: description,
				upvotes: upvotes,
				subreddit: subreddit,
				comments: comments,
			},
		},
	});

	return data;
};

module.exports = route;
