var githubRoute = require(__routes+'/github/search');
var Operation = require(__database+'/Operation');

describe('Route', function() {
	var currentPage = 1;
	this.timeout(20000); // 20 seconds

	before( function(done) {
		Operation.remove(done);
	});

	it('should scrape two pages and return results', function(done) {
		var agent = githubRoute.start('nodejs');

		agent.on('scraped:page', function(results) {
			currentPage++;
			if ( currentPage === 3 ) {
				if ( !results ) 
					return done( new Error('No results returned') );

				agent.stop();
			}
		});
		
		agent.once('operation:stopped', done.bind(this, null));
		agent.once('error', done);
	});

	it('should start in the next page', function(done) {
		var agent = githubRoute.start('nodejs');

		agent.once('operation:start', function(operation) {
			if ( operation.state.currentPage !== currentPage )
				return done( new Error('Current page do not matches') );

			currentPage++;
			agent.stop();
		});

		agent.once('operation:stopped', done.bind(this, null));
	});

});
