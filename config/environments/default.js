
exports.mongo = {
	db: 'nest',
	host: '127.0.0.1',
	// user: 'mongo',
	// pass: 'password'
};

exports.redis = {
	db: 'nest',
	host: '127.0.0.1',
	port: 6379,
	options: {
		parser: 'hiredis',
	},
};
