Nest
==============

A data extraction framework on NodeJS. Replicate another site's data without touching its database.

#### Features
  * PhantomJS scraping. No more "Couldn't scrape because data was dynamic" bs.
  * Persistent state. You can stop and start the engine at any time without worrying of losing data or the current flow.
  * Controlled, parallel scraping.
  * Dead-simple interface for scripting new domains.

#### Todo
  * Send debug messages to log file.
  * Write documentation.
  * engine.stop() method. Currently, there's no way to stop the engine once it starts.
  * Support for multiple engines running different processes / servers.
  * Implement [Tor](https://github.com/d-oliveros/node-tor-nightcrawler).

#### Requirements
  * MongoDB, if running on local.
  * PhantomJS (sudo npm install -g phantomjs)

## Installation

```
npm install
sudo npm install -g phantomjs
```

#### Tests

Before starting the engine, you should run the tests to see if everything's OK with your setup.

```
make test
```

## Usage

```
node index
```

When running `node index`, the engine will start, but nothing will happen because there are no operations to process. Right now, the only way to start replicating a site's database is to run a script.

To quickly check this up, run:

```js
node scripts/github
node index
```

#### How does it work?

Try running `DEBUG=* node index` and looking at the console messages. You can also look into the tests in each module to see what everything is doing. I haven't got into writing a proper documentation for this thing, so...

## Routes

A route is a definition of a website's section, like a search results page, or a post page. A route definition has various components:

- Scraper function. Transforms the HTML into structured data.
- URL generator function. Transforms the query and operation's state into a URL string.
- Route name.
- Priority.
- Test options.

A route can be started with a query by doing:

```js
require('./globals'); // todo: remove globals

var github = require(__routes+'/github');
var query = 'nodejs';
github.search.start(query);
```

The `Route:start` method returns an `Agent` instance, which will emit events when things happen:

```js
require('./globals'); // Kill me for using globals

var github = require(__routes+'/github');
var agent = github.search.start('nodejs');

agent.on('scraped:page', function(results) {
	console.log('Got scraped data!', results);
});

agent.on('operation:finish', function(operation) {
	console.log('Operation finished!');
	// Stats on operation.stats
	console.log('Operations created: '+operation.stats.items);
	console.log(operation.stats.spawned+' new potential routes created!');
});
```

You don't have to manually save the results into the DB; The agent will save all the scraped results in the database for you, and will make sure it doesn't accidentally scrape the same link twice.

## Engine

Normally, a scraping op will spawn a bunch of other scraping operations. That's when the engine comes in handy. By default, the engine will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every 600ms.

The `Worker` class is a sub-class of the Agent class. The Agent class is extending EventEmitter. The Agent class has the ability to add external EventEmitters and emit events to them, and can also spawn phantomJS processes and open URLs and do a bunch of cool stuff.

## Creating new routes

The `Route` class makes it dead-simple to program crawlers on new sites. You can create a new Route like this:

```js
var someRoute = new Route({
	provider: 'stackoverflow',
	name: 'profile',
	url: 'http://stackoverflow.com/users/<%= query %>',
	priority: 90,

	// Optional: 
	// If you want to test your crawler without having to 
	// actually write a test for it, set up this property and
	// run npm test. It will automatically test this route.
	test: {
		query: '2803446/david-oliveros',
		shouldCreateItems: true, // Are we expecting new items out of this route?
		shouldSpawnOperations: true, // Are we expecting new operations out of this route?
	},

});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
someRoute.scraper = function() {
	var data = {
		items: [],
	};

	data.items.push({
		key: $('#id-of-this-item').text(), // this is the only required property
		name: $('#user-displayname a').text(),
		link: 'https://domain.com/'+id, // Canonical link to this content
		type: 'user',

		// Any other property will be saved in the database
		age: $('#age-container').text(),
		somethingElse: $('#important-stuff').text(),
		/* ...will save any property... */
	});

	return data;
};
```

You can place this new route on the `/routes` folder, and test the route by running `make test`.

You can start some initial routes from a script file by doing `someRoute.start(queryParameter)`. You can place those on `/scripts` for now.

The most basic and direct example is found on `scripts/imdb.js`. It is able to scrape all IMDB movies (at least the most popular 100k) in one night.

You can also do a script to create a bunch of operations, and let the engine scrape it all. See `scripts/github.js`.

## Adding your own environment (database)

Copy config/environments/default.js to /config/environments/local.js, /config/environments/production.js, /config/environments/test.js etc, and set up the database host and credentials.

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
