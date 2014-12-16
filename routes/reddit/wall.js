var Route = require(__framework+'/Route');

var route = new Route({
	title: 'Subreddit Wall',
	name:  'reddit:wall',
	url:   'http://www.reddit.com/r/<%= query %>/new/?count=<%= ((state.currentPage-1) * 25) %><% if (state.data.lastId) { %>&after=t3_<%= state.data.lastId %><% } %>', // must set tail property to data on state
	priority: 80,
	test: {
		query: 'compsci',
		shouldCreateItems:  false,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		hasNextPage: !!$('.nav-buttons a[rel="nofollow next"]').length,
		items: [],
		operations: [],
		state: {},
	};

	var $posts = $('#siteTable div.thing');
	$posts.each(function() {
		var $post  = $(this);
		var $title = $post.find('a.title');

		var id        = $post.data('fullname').split('_')[1].trim();
		var title     = $title.text().trim();
		var upvotes   = $post.find('div.score.unvoted').text().trim();
		var subreddit = window.location.pathname.split('/')[2];

		data.items.push({
			name: title,
			key: id,
			local: {
				link: 'http://www.reddit.com/'+id,
				data: {
					upvotes: upvotes,
					subreddit: subreddit,
				},
			},
		});

		data.operations.push({
			routeName: 'reddit:post',
			query: id,
		});

		data.state.lastId = id;
	});

	return data;
};

module.exports = route;
