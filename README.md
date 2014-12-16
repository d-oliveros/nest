Nest
==============

A robust scraping and crawling engine powered with NodeJS.

### Features

  * PhantomJS scraping. No more "Couldn't scrape because data was dynamic" bs.
  * Persistent state. You can stop and start the engine at any time without worrying of losing data or the current flow.
  * Controlled, parallel processment of scraping operations.
  * Dead-simple interface for scripting new crawlers on other sites.
  * Web-based interface that is... currently useless. (The engine events are being send through websockets, though)


### Todo

  * Write documentation.
  * engine.stop() method. Currently, there's no way to stop the engine once it starts.
  * Support for multiple engines running different processes / servers.
  * Implement Tor (https://github.com/d-oliveros/node-tor-nightcrawler).
  * Implement a better logging system. Mixpanel sucks ass for this kind of stuff (ultra expensive)
  * Remove the globals?
  * Remove Redis as a dependency: It is not used at all (yet?).
  * Better web-based interface. Thinking on a metrics dashboard, or a way to start crawling operations from there.

### Requirements
  * MongoDB + Redis, if running on local.
  * PhantomJS (sudo npm install -g phantomjs)

## Usage

```
npm install
bower install
```

#### Tests

Before starting the engine, you should run the tests to see if everything's OK with your setup.

```
npm test
```

You can also lint with gulp
```
gulp
```

##### To start the engine and web-based interface:

```
node bin/start
```

##### To start the engine with worker messages (recommended)

```
DEBUG=Worker node bin/start
```

When running node bin/start, nothing will happen because there are still no operations to process.

#### To quickly check this up, run:

```js
node bin/pwn-github
DEBUG=Worker node bin/start
```

#### WTF's happining?

Don't know where to start. You can look into the tests in each module to see what everything is doing. I haven't got into writing a proper documentation for this thing, so...

To start a single route, you can do something like:

```js
require('./globals'); // Kill me for using globals
var github = require(__routes+'/github');
var agent = github.search.start('nodejs');

agent.on('scraped:page', function(results) {
	console.log('Got scraped data!', results);
});

agent.on('operation:finish', function(op) {
	console.log('Operation finished!');
});
```

Normally, a scraping op will spawn a bunch of other scraping operations. That's when the engine comes in handy. By default, the engine will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every 600ms.

The `Worker` class is a sub-class of the Agent class. The Agent class is extending EventEmitter. The Agent class has the ability to add external EventEmitters and emit events to them, and can also spawn phantomJS processes and open URLs and do a bunch of cool stuff.

The `Route` class makes it dead-simple to program crawlers on new sites. You can create a new Route like this:

```js
var someRoute = new Route({
	name: 'stackoverflow:profile',
	url: 'http://stackoverflow.com/users/<%= query %>',
	priority: 90,

	// Optional: 
	// If you want to test your crawler without having to 
	// actually write a test for it, set up this property and
	// run npm test. It will automatically test this route.
	test: {
		query: '2803446/david-oliveros',
		shouldCreateProfiles: true, // Are we expecting new profiles out of this route?
		shouldSpawnOperations: true, // Are we expecting new operations out of this route?
	},

});

// This function is executed in the PhantomJS contex;
// we have no access to the context out of this function
someRoute.scraper = function() {
	var data = {
		profiles: [],
		operations: [],
	};

	data.profiles.push({
		name: $('#user-displayname a').text(),
		email: $(...),
		image: $(...),

		// The "Local" property will be added to the profile saved in the database,
		// as part of this route. Basically the idea is you can have the same person
		// on multiple sites, but you only want to keep a single record for him.
		// To solve this, all the profiles are created and updated with a domain property,
		// and all the data that is local to this domain will be saved in a corresponding field
		// in the database. I suck at explaining things, take a look at the Profile schema to know more.
		local: {

		}
	});


	return data;
};
```

Then, you can start the route by doing `someRoute.start(queryParameter)`. This will return an Agent instance.

You can also do a script to create a bunch of operations, and let the engine scrape it all (See bin/pwn-github);


### Adding your own environment (database, mixpanel tracking, etc)

Copy config/environments/default.js to /config/environments/local.js, /config/environments/production.js, /config/environments/test.js etc, and set up the database host, credentials, mixpanel key, etc.

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
