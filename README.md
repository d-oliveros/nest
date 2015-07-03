
Nest
==============

A scraping and data extraction framework on NodeJS.

#### Features

  * Static and Dynamic scraping (with PhantomJS)
  * Persistent state
  * Parallel scraping with workers
  * Automated route tests
  * Command-line Interface

#### Requirements

  * MongoDB and PhantomJS installed on your system

If you don't have PhantomJS installed already, you can install it by doing:

```
npm install -g phantomjs
```


## Installation

```
npm install
```

The main executable file is bin/nest. You can run nest locally, or expose it globally by running the `symlink-setup.sh` script. This script create a symlink in /usr/local/bin, and will let you run nest from the terminal. The idea is to eventually publish Nest as a global module, but I haven't gotten into it.

```bash
# When used locally
node ./bin/nest

# When used globally
nest
```

You should run the tests to see if everything's OK with your setup:

```
nest test
```


#### Quickstart

To quickly check this up, run:

```
nest scrape reporteindigo
```

This will start scraping that domain, and start populating your local `nest` mongo database.


## Usage

```bash

# Display help information
nest help

# Lists available routes to use
nest list

# Start a route with the specified query. [query] is optional
nest scrape [routeId] [query]

# Starts scraping [domain] by running the init script in /routes/[domain]/init.js
nest scrape [domain]

# Tests a route
nest test [routeId]

# Tests all routes that are part of [domain]
nest test [domain]

# Starts the scraping engine. You don't need to run this to start nest
# This is to continue the work it was doing before exitting
nest work

```

Examples:

```bash

# Starts extracting articles from reporteindigo
nest scrape reporteindigo

# Tests the "imdb:search" route
nest test imdb:search

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

You can view the data using Mongo's CLI, by doing for example:

```bash
mongo nest
> db.items.find().pretty()
# If you want to look at the data of a particular domain, you can do:
> db.items.find({ provider: 'imdb' }).pretty()
```

There's also a really sweet [express-based MongoDB UI](https://github.com/andzdroid/mongo-express) you can use.


## Scraping a website

You can create a new route by creating a file in `./routes/[somedomain]/[routename].js`

The file should look like this:

```js
import Route from '../../src/Route';

export default new Route({

  // The route's domain, for example wikipedia
  provider: 'wikipedia',

  // The route's name
  name: 'post',

  // The route's URL template. This will be wrapped in an underscore template
  url: 'http://en.wikipedia.org/wiki/<%= query %>',

  // Routes with higher priority are scraped first
  priority: 80,

  // If  set to `true`, Nest will use PhantomJS to scrape this route,
  // allowing you to scrape dynamic content loaded with javascript.
  // *in most cases, you don't need the dynamic scraper to scrape successfully.
  //
  dynamic: true,

  // If this property is set, you will be able to test the scraper on this route
  // programatically, by doing "nest test testdomain:testroute" in the CLI.
  //
  test: {
    query: 'Test', // Replaces <%= query => in this route's URL template
    shouldCreateItems:  true, // Are we expecting new items saved to the db?
    shouldSpawnOperations: false // Are we expecting Nest to crawl more pages?
  },

  // This function will be used to structure the data out of the raw HTML
  // Nest will wrap the HTML in jQuery, and pass it as the first argument
  // You can use jQuery as you would normally do in the browser
  //
  // You should return an object with the following properties:
  // - items:       `Array` Items to save in the database
  // - operations:  `Array` Routes to be crawled
  // - hasNextPage: `Boolean` If true, Nest will scrape the next page
  //
  scraper($) {
    let data = {
      items: [],
      operations: [],
      hasNextPage: false
    };

    // *Dummy data extractor. This does not work, do not try to run it.
    data.items.push({
      key: $('#some-key-id').text(),
      name: $('#something').text(),
      body: $('#another-thing').text(),
      // ...any other property in this object will be saved to the database
      anotherField: $('#thing').text()
    });

    return data;
  }
});
```

This is all you need to make your route available in `nest list`, and to start scraping the website by doing `nest scrape [routeId]`.
The `[routeId]` is composed of `[routeDomain]:[routeName]`. In this examples, that is `wikipedia:post`.

To see if your route is working, you can test it by doing: `nest test [routeId]`:
- If `shouldCreateItems` is set to `true`, the test expects new items to be created after running the scraper.
- If `shouldSpawnOperations` is set to `true`, the test expects new scraping operations to be added to the queue.

To start the route, you can do `nest scrape [mydomain]:[myroute] [query]` (`[query]` is optional).

You can also create a domain scraping initialization script file. You can do so by creating a file with the name `init.js` in your domain's routes folder. To run a domain init script, just do `nest scrape [domain]`.

The most basic and direct example is found on `routes/imdb/init.js`. It is able to scrape all IMDB movies (at least the most popular 100k) in one night.

You can also do a script to create a bunch of operations, and let the engine scrape it all. See `routes/github/init.js`.


#### How it works?

After extracting data from a page, `Nest` saves the data in the `items` mongo collection, and spawns new operations based on the results of the scraping function. `Nest` also keeps track of the pages it has scraped, and never repeats itself. This can potentially lead to an infinite crawling loop that would only end when every single page on the website is scraped (or completely disconnected).

The `Route:start` method returns a `Spider` instance which will emit events when things happen:

```js
var githubSearch = require('./routes/github/search');

// This will search github for "nodejs", and scrape the results into structured data
var spider = githubSearch.start('nodejs');

// Emitted every time a page is scraped. For paginated pages like 
// a search result page, this event is fired multiple times
spider.on('scraped:page', function(results) {
  console.log('Got scraped data!', results);
});

// Emitted when there are no more pages to scrape
spider.on('operation:finish', function(operation) {
  console.log('Operation finished!');

  // Stats on operation.stats
  console.log('Operations created: '+operation.stats.items);
  console.log(operation.stats.spawned+' new potential routes created!');
});
```

## Engine

By default, the engine will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every 600ms.

The `Worker` class is a sub-class of the Spider class. The Spider class is extending EventEmitter. The Spider class has the ability to add external EventEmitters and emit events to them, and can also spawn phantomJS processes and open URLs and do a bunch of cool stuff.


## Modules

A module is a middleware function that gets executed after scraping and sanitizing a web page. Right now, there's only one module `human` that adds metadata for items that have the "type" property set to "user". The properties it adds are: 

- `nameIsHuman`: Flag to determine if a name is a real human name

This module is disabled by default. To enable this module,
you need to provide a names.json file containing an array of names.

You can use this names list, it has 37.6k names:

https://gist.github.com/d-oliveros/3693a104a0dc82695324

create the file ./src/modules/human/names.json with that data to enable the module.

Try running `DEBUG=* nest work` and looking at the console messages. You can also look into the tests in each module to see what everything is doing.


## Environment

To limit the number of workers, change your database host / settings, or override any config-level variable, copy config/environments/default.js to /config/environments/local.js, /config/environments/test.js, /config/environments/production.js etc, and change the variables 

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
