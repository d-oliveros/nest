var Route = require('../../lib/route');

var route = new Route({
	provider: 'github',
	name:  'following',
	url:   'https://github.com/<%- query %>/following?page=<%= state.currentPage %>',
	priority: 50,

	test: {
		query: 'isaacs',
		shouldCreateItems:  false,
		shouldSpawnOperations: true,
	}
});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
route.scraper = function() {
	var data = {
		operations: []
	};

	var hasPagination = $('.paginate-container').find('a').length > 0;

	// Get all the usernames in this page
	$('.follow-list-item').each(function() {
		data.operations.push({
			provider: 'github',
			route: 'profile',
			query: $(this).find('.gravatar').parent().attr('href').substr(1), 
		});
	});

	if ( hasPagination ) {
		data.hasNextPage = $('.paginate-container').find('.pagination').children().last().prop("tagName") === 'A';
	}

	return data;
};

module.exports = route;
