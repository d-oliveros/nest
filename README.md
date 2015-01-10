
Nest
==============

A data extraction framework on NodeJS. Replicate another site's data without touching its database.

#### Features

  * PhantomJS parallel scraping.
  * Persistent scraping state.
  * Dead-simple interface for scripting new domains.
  * Automated route scraping tests


#### Requirements

  * MongoDB and PhantomJS installed on your system

If you don't have PhantomJS installed already, you can install it by doing:

```
sudo npm install -g phantomjs
```


## Installation

```
npm install
```

Run the tests to see if everything's OK with your setup:

```
npm test
```

There's a bin file (executable) you can use in bin/nest.

You can expose the executable globally by running the `symlink-setup.sh` script. 
This will create a symlink in /usr/local/bin, and will let you run nest from the
terminal like this: `nest scrape [parameters]`.

If you don't expose `nest` globally, you can still use it locally 
by replacing "nest" with "./bin/nest":

```
./bin/nest scrape imdb
./bin/nest scrape github
./bin/nest scrape reddit
```


#### Quickstart

To quickly check this up, run:

```
nest scrape imdb
```

This will initialize the IMDB data extractor, and start populating your local `nest` mongo database.


## Usage

```
// Run the init script for this domain. The scripts are located in /scripts
nest scrape [domain]

// Start a route with the specified query
nest scrape [domain:route] [query]

// Starts the engine, scrape and spawn pending operations
nest work

```

Examples:

```
nest scrape imdb
nest scrape github:profile d-oliveros
nest scrape github
nest work
```

To see a more verbose script, run the any extractor with the DEBUG=* argument set:

```
DEBUG=* nest work
```

You can view the data from Mongo's CLI, by doing:

```
mongo nest
db.items.find().pretty()
```

There's also a really sweet [express-based MongoDB UI](https://github.com/andzdroid/mongo-express) you can use in your server,
if you are planning on having the DB on a server.


## Routes

A route must be built before being able to use it with nest.

A route represents a website's section, like a search results page, or a post page. 
A route definition has various components:

- A Scraper function, which is run in a sandboxed PhantomJS context. This function should transform the HTML into structured data. jQuery is already loaded in this context for you to use it.
- URL Template. Builds URL string. the `operation` object is available in this context, so you can use the current page, the query string, etc
- Domain name.
- Route name.
- Priority.
- Test options. (Optional, if you want to auto-test your route)


#### Route usage

A route can be started with a query by doing:

```js
var github = require('./routes/github');
var query = 'nodejs';
github.search.start(query);
```

The `Route:start` method returns an `Agent` instance, which will emit events when things happen:

```js
var github = require('./routes/github');
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


## Creating new routes

The `Route` class makes it dead-simple to program crawlers on new sites. You can create a new Route like this:

```js
var someRoute = new Route({
	provider: 'stackoverflow', // a.k.a. domain
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

You can place this new route on the `/routes` folder, and test the route by running `npm test`.

You can create a domain initialization script file and put those on `/scripts`.
To run a domain init script, just do `nest scrape [domain]` without a route name.
Nest will look in the /scripts directory for an init script that matches the domain name.

The most basic and direct example is found on `scripts/imdb.js`. It is able to scrape all IMDB movies (at least the most popular 100k) in one night.

You can also do a script to create a bunch of operations, and let the engine scrape it all. See `scripts/github.js`.


## Modules

A module is a middleware function that gets executed after scraping and sanitizing a web page. Right now, there's only one module `human` that adds metadata for items that have the "type" property set to "user". The properties it adds are: 

- `nameIsHuman`: Flag to determine if a name is a real human name

This module is disabled by default. To enable this module,
you need to provide a names.json file containing an array of names.

You can use this names list, it has 37.6k names:

https://gist.github.com/d-oliveros/3693a104a0dc82695324

create the file ./framework/modules/human/names.json with that data to enable the module.


## Engine

Normally, a scraping op will spawn a bunch of other scraping operations. That's when the engine comes in handy. By default, the engine will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every 600ms.

The `Worker` class is a sub-class of the Agent class. The Agent class is extending EventEmitter. The Agent class has the ability to add external EventEmitters and emit events to them, and can also spawn phantomJS processes and open URLs and do a bunch of cool stuff.


## How does it work?

Try running `DEBUG=* nest work` and looking at the console messages. You can also look into the tests in each module to see what everything is doing.


## Adding your own environment (database, cloud environment, etc)

Copy config/environments/default.js to /config/environments/local.js, /config/environments/test.js, /config/environments/production.js etc, and set up the database host and credentials.

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
