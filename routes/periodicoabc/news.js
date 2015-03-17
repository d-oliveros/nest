var Route = require('../../lib/route');

var route = new Route({
	provider: 'periodicoabc',
	name:     'news',
	url:      'http://www.periodicoabc.mx/functions/jsonHome-news.php?pagina=<%= state.currentPage %>',
	priority: 80,

	
	test: {
		query: '',
		shouldCreateItems:  true,
		shouldSpawnOperations: true,
	},
});

route.scraper = function($, html) {
	var data; 

	try {
		data = JSON.parse(html);
	} catch (e) {
		throw new Error('Invalid JSON');
	}

	var items = data.map( function(item) {
		return {
			title: item.titulo,
			posted: new Date(item.fecha.replace(' de', '').replace(' del', '')),
			link: item.link,
			key: item.link.replace('http://www.periodicoabc.mx/', ''),
		};
	});

	var operations = items.map( function(item) {
		return {
			provider: 'periodicoabc',
			route: 'post',
			query: item.key,
		};
	});

	var data = {
		hasNextPage: items.length > 0,
		items: items,
		operations: operations,
	};

	return data;
};

module.exports = route;
