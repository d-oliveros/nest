if ( process.env.NODE_ENV === 'production' )
	throw new Error('Disabled on production.');

require('../globals');

var database = require(__database);

var Operation = require(__models+'/Operation');
var Profile   = require(__models+'/Profile');

database.mongo.on('open', function() {
	Operation.remove({}, function(err) {
		if (err) return console.error(err);
		Profile.remove({}, function(err) {
			if (err) return console.error(err);
			console.log('Database dropped.');
			process.exit(0);
		});
	});
});
