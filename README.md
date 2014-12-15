Nest
==============

A robust scraping and crawling engine powered with NodeJS.

### Features

  * Persistent state: You can stop and start the engine at any time without worrying of losing data.
  * Controlled parallel processment.


### Todo

  * Implement Tor (https://github.com/d-oliveros/node-tor-nightcrawler)
  * Number of workers based on number of cores / memory
  * Better documentation
  * Better web-based interface


### Requirements
  * PhantomJS (sudo npm install -g phantomjs)

## Usage

```
npm install
bower install
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

Cheers.
