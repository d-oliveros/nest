Nest
==============

A robust scraping and crawling engine powered with NodeJS.

### Features

  * Persistent state: You can stop and start the engine at any time without worrying of losing data.
  * Controlled parallel processment.


### Todo

  * Implement Tor (https://github.com/d-oliveros/node-tor-nightcrawler)
  * Number of workers based on number of cores / memory
  * Write documentation
  * Better web-based interface


### Requirements
  * MongoDB installed.
  * PhantomJS (sudo npm install -g phantomjs)

## Usage

```
npm install
bower install
```

##### Tests

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

Open your localhost:3000, and click on the only button on screen. You should start seeing a bunch of worker messages on your console.

### Adding your own environment (database, mixpanel tracking, etc)

Copy config/environments/default.js to /config/environments/local.js, /config/environments/production.js, /config/environments/test.js etc, and set up the database host, credentials, mixpanel key, etc.

If you don't do this, the default environment is used. This environment is using the database "nest" on localhost, default port.

Cheers.
