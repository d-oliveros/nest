var database = require('./index');

describe('Database', function() {
	describe('Clients', function() {
		it('should be able to execute a mongo command', function(done) {
			// todo
			done();
		});

		it('should be able to execute a redis command', function(done) {
			database.redis.set('test', 'Testing...');
			database.redis.del('test');
			done();
		});
	});
});
