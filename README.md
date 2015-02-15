
Nest
==============

A data extraction framework on NodeJS. Replicate another site's data without touching its database.

#### Features

  * PhantomJS scraping
  * Persistent state.
  * Automated scraping route tests.
  * Workers.

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

The main executable file is bin/nest. You can run nest locally, or expose it globally by running the `symlink-setup.sh` script. 
This will create a symlink in /usr/local/bin, and will let you run nest from the terminal.

```bash
# When used locally
./bin/nest scrape imdb

# When used globally
nest scrape github
```

You should run the tests to see if everything's OK with your setup:

```
nest test
```


#### Quickstart

To quickly check this up, run:

```
nest scrape imdb
```

This will initialize the IMDB data extractor, and start populating your local `nest` mongo database.


## Usage

```bash
# Runs the init script for this domain
nest scrape [domain]

# Start a route with the specified query
nest scrape [domain:route] [query]

# Lists available routes to use
nest list

# Tests a route
nest test [domain:route]

# Tests all routes from [domain]
nest test [domain]

# Starts the engine, scrape and spawn pending operations
# You don't need to run this to start nest. This continues where it left
nest work

```

Examples:

```bash

# Starts extracting movie data from IMDB
nest scrape imdb

# Tests the "github:profile" route
nest test github:profile

# Scrapes a github profile
nest scrape github:profile d-oliveros

# Scrapes all github lol
nest scrape github

# Continue previous operations
nest work
```

To see a more verbose script, run nest with `DEBUG=*`:

```bash
DEBUG=* nest work
```

You can view the data from Mongo's CLI, by doing:

```bash
mongo nest
> db.items.find().pretty()
```

There's also a really sweet [express-based MongoDB UI](https://github.com/andzdroid/mongo-express) you can use.


## Routes

A route represents a website's section, and is generally accompanied by an ID. For example, /users/:userId, or /posts/:id?sort=asc. In `Nest`, the routes are predefined, and are stored under the `/routes` folder. For `Nest` to load the route correctly, the routes must be organized by providers, and can optionally have a `init.js` script located in the root of the domain's directory.

The routes inside the `/routes` folder are independent, meaning you can require them in your modules, and they should work just fine (There's also a bin command allowing you to start routes easily: `nest scrape`).

```js
var githubSearch = require('./routes/github/search');
var query = 'nodejs';
githubSearch.start(query);
```

When starting a route, a `PhantomJS` instance will be created, and it will scrape the route's URL using the query string provided, and the scraping state, like the current page, and misc data provided by previous scraping operations on the same route. For example, if the section is paginated, the route will continue scraping the next pages, until all the pages are processed. If the process is stopped while running a route, it will save its state so it can be resumed on later on. See `nest work`.

After extracting data from a page, `Nest` saves the data in the `items` mongo collection, and spawns new operations based on the results of the scraping function. `Nest` also keeps track of the pages it has scraped, and it never repeats itself. This can potentially lead to an infinite crawling loop that would only end when every single page on the website is scraped (or completely disconnected).

The `Route:start` method returns an `Spider` instance, which will emit events when things happen:

```js
var githubSearch = require('./routes/github/search');
var spider = githubSearch.start('nodejs');

spider.on('scraped:page', function(results) {
	console.log('Got scraped data!', results);
});

spider.on('operation:finish', function(operation) {
	console.log('Operation finished!');

	// Stats on operation.stats
	console.log('Operations created: '+operation.stats.items);
	console.log(operation.stats.spawned+' new potential routes created!');
});
```

You can create a new route by creating a file in `./routes/[somedomain]/[routename].js`

```js
var someRoute = new Route({
	provider: 'stackoverflow', // a.k.a. domain
	name: 'profile',
	url: 'http://stackoverflow.com/users/<%= query %>',
	priority: 90,

	// Optional. If you want to automatically test your scraper,
	// set up this property and run `nest test domain:route`.
	test: {
		query: '2803446/david-oliveros',
		shouldCreateItems: true, // Are we expecting new items from this route?
		shouldSpawnOperations: true, // Are we expecting new operations?
	},

});

// This function is executed in the PhantomJS context
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

You can test if your route work by doing `nest test [domain]:[route]`. 
If `shouldCreateItems` is set to `true`, the test runs the scraper, and expects new items to be created.
If `shouldSpawnOperations` is set to `true`, the test expects new operations to be created.

To start the route, you can do `nest scrape [mydomain]:[myroute] [query]`. `[query]` is optional.

You can also create a domain scraping initialization script file. You can do so by adding a file names `init.js` to the root of the folder containing the domain's routes. To run a domain init script, just do `nest scrape [domain]` without a route name.

The most basic and direct example is found on `routes/imdb/init.js`. It is able to scrape all IMDB movies (at least the most popular 100k) in one night.

You can also do a script to create a bunch of operations, and let the engine scrape it all. See `routes/github/init.js`.


## Modules

A module is a middleware function that gets executed after scraping and sanitizing a web page. Right now, there's only one module `human` that adds metadata for items that have the "type" property set to "user". The properties it adds are: 

- `nameIsHuman`: Flag to determine if a name is a real human name

This module is disabled by default. To enable this module,
you need to provide a names.json file containing an array of names.

You can use this names list, it has 37.6k names:

https://gist.github.com/d-oliveros/3693a104a0dc82695324

create the file ./lib/modules/human/names.json with that data to enable the module.


## Engine

Normally, a scraping op will spawn a bunch of other scraping operations. That's when the engine comes in handy. By default, the engine will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every 600ms.

The `Worker` class is a sub-class of the Spider class. The Spider class is extending EventEmitter. The Spider class has the ability to add external EventEmitters and emit events to them, and can also spawn phantomJS processes and open URLs and do a bunch of cool stuff.


## How does it work?

Try running `DEBUG=* nest work` and looking at the console messages. You can also look into the tests in each module to see what everything is doing.


## Environment

To limit the number of workers, change your database host / settings, or override any config-level variable, copy config/environments/default.js to /config/environments/local.js, /config/environments/test.js, /config/environments/production.js etc, and change the variables 

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
