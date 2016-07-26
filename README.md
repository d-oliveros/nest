
Nest
==============

Nest is a high-level, robust framework for web scraping.


## Features

* Dynamic Scraping with PhantomJS
* Static scraping, without PhantomJS or JS evaluation
* A worker queue for persistent, parallel scraping
* MongoDB integration. Scraped items are automatically saved to a Mongo db
* Persistent State
* Dead-simple API


## Requirements

  * MongoDB up and running
  * Node


## Installation

[Install MongoDB](https://docs.mongodb.com/manual/installation/#mongodb-community-edition).

Also install node-nest in your project:

```shell
npm install node-nest
```

## Usage

```js
// Instanciates a new Nest object
var Nest = require('node-nest');
var nest = new Nest();

// Register routes
var someRoute = require('./routes/some-route');
var anotherRoute = require('./routes/another-route');
nest.addRoute(someRoute);
nest.addRoute(anotherRoute);

// Queues scraping operations
nest.queue('some-route', { priority: 90, query: { userId: 123 } });
nest.queue('another-route', { query: { someVar: 'something' } });

// Starts the engine
nest.start();
```

### Example

* You can find this example's [full code here](https://github.com/d-oliveros/nest-hackernews).

In this guide, we'll scrape Hackernews articles. To use Nest, you first need to initialize a Nest object:

```js
var Nest = require('node-nest');
var nest = new Nest();
```

By default, Nest will use the same amount of workers as you have CPU cores. It will also try to connect to a MongoDB running at `127.0.0.1:27017`. You can configure these parameters by doing:

```js
var Nest = require('node-nest');

var nest = new Nest({
  workers: 4,         // Set the amount of workers scraping in parallel to 4
  mongo: {
    db: 'nest',       // Use the 'nest' mongo collection
    host: '127.0.0.1' // Connect to the Mongo process running at localhost
    port: '27017'     // Connect to the Mongo process running at port 27017
  }
});
```

Then you must define some routes. A route is a definition of a site's section, for example a profile page, a post page, or a search results page.

#### Route

A route defines the URL pattern that matches a particular site section, and describes how the data should be structured out of this page, by explicitly defining a scraping function.

Depending on the returned data from the scraping function, Nest will store the structured scraped data in the mongo database and/or queue more URLs to be scraped.

You can add more routes by using the method `nest.addRoute()`. Let's define how the "hackernews homepage" route should be scraped:

```js
nest.addRoute({

  // This is the route ID
  key: 'hackernews-homepage',

  // This is the URL pattern corresponding to this route
  url: 'https://news.ycombinator.com',

  // This is the scraper function, defining how this route should be scraped
  scraper: function($) {

    // You should return an object with the following properties:
    // - items:       `Array` Items to save in the database.
    // - jobs:        `Array` New scraping jobs to add to the scraper worker queue
    // - hasNextPage: `Boolean` If true, Nest will scrape the "next page"
    var data = {
      items: []
    };

    // The HTML is already loaded and wrapped with Cheerio in '$',
    // meaning you can get data from the page, jQuery style:
    $('tr.athing').each((i, row) => {
      data.items.push({
        title: $(row).find('a.storylink').text(),
        href: $(row).find('a.storylink').attr('href'),
        postedBy: $(row).find('a.hnuser').text(),

        // this is the only required property in an item object
        key: $(row).attr('id')
      };
    });

    // In this example, Nest will only save the objects
    // stored in 'data.items', into the mongo database
    return data;
  }
});
```

Then, you need to queue some scraping operations, and start the engine:

```js
nest.queue('hackernews-homepage');
nest.start().then(() => console.log('Engine started!'));
```

To run this example, just run it with Node. Let's say you called this file "scrape-hackernews.js":

```shell
node scrape-hackernews
```

After running this example, your database will contain 30 scraped items from hackernews, with the following structure:

```json
{
  "_id" : ObjectId("5797199075c2d900da9e3a3e"),
  "key" : "12160127",
  "routeWeight" : 50,
  "routeId" : "hackernews-homepage",
  "href" : "https://github.com/jisaacso/DeepHeart",
  "title" : "DeepHeart: A Neural Network for Predicting Cardiac Health"
},
{
  "_id" : ObjectId("5797199075c2d900da9e3a3d"),
  "key" : "12160374",
  "routeWeight" : 50,
  "routeId" : "hackernews-homepage",
  "href" : "http://www.wsj.com/articles/apple-taps-bob-mansfield-to-oversee-car-project-1469458580",
  "title" : "Apple Taps Bob Mansfield to Oversee Car Project"
},
...etc
```

Try looking at the scraped data using mongo's native REPL:

```shell
mongo nest
> db.items.count()
> db.items.find().pretty()
```

* You will see multiple "There are no pending jobs. Retrying in 1s" messages. This is fine. It means that the engine finished processing all the queued jobs, and the workers are just waiting for new jobs.

When running this program again, the route "hackernews-homepage" will not be scraped again, because the state is persisted in Mongo, and Nest doesn't re-scrapes individual URLs that have already been scraped.

You will notice this route is not that helpful, as it is just getting superficial data from each item (The title and the href), and it's only scraping the first page of hackernews.

Let's create a "hackernews post" route, and a new "hackernews articles" route. The new articles route should scrape the first 10 pages of hackernews, and queue a scraping job to "hackernews post" for each scraped article in the articles list. The items in the database will be updated by the new information, after scraping their post pages.

The [full example](https://github.com/d-oliveros/nest-hackernews) looks as follows:

```js
// in scrape-hackernews.js

var Nest = require('node-nest');

var nest = new Nest();

nest.addRoute({
  key: 'hackernews-post',

  // Route url strings are passed to lodash's 'template' function.
  // You can also provide a function that should return the newly built URL
  // @see https://lodash.com/docs#template
  url: 'https://news.ycombinator.com/item?id=<%= query.id %>',

  scraper: function($) {
    var $post = $('tr.athing').first();

    return {
      items: [{
        key: $post.attr('id'),
        title: $post.find('.title a').text(),
        href: $post.find('.title a').attr('href'),
        postedBy: $post.find('.hnuser').text(),

        // for the sake of this tutorial let's just save most voted comment
        bestComment: $('.comment').first().text()
      }]
    };
  }
});

nest.addRoute({
  key: 'hackernews-articles',

  // the scraping state is available in the URL generator function's scope
  // we can use the "currentPage" property to enable pagination
  url: 'https://news.ycombinator.com/news?p=<%= state.currentPage %>',

  scraper: function($) {
    var currentPage = $('.rank').last().text() / 30;

    var data = {
      items: [],

      // by returning data through the 'jobs' property,
      // you are queueing new scraping operations for the workers to pick up
      jobs: [],

      // if this property is true, the scraper will re-scrape the route,
      // but with the 'state.currentPage' parameter incremented by 1
      //
      // for the sake of this tutorial, let's just scrape the first 5 pages
      hasNextPage: currentPage < 5
    };

    // for each article
    $('tr.athing').each((i, row) => {

      // create superficial hackernews article items in the database
      data.items.push({
        key: $(row).attr('id'),
        title: $(row).find('a.storylink').text(),
        href: $(row).find('a.storylink').attr('href'),
        postedBy: $(row).find('a.hnuser').text()
      });

      // also, queue scraping jobs to the "hackernews-post" route, defined above
      data.jobs.push({
        routeId: 'hackernews-post', // defines which route to be used
        query: { // defines the "query" object, used to build the final URL
          id: $(row).attr('id')
        }
      });
    });

    // Nest will save the objects in 'data.items' and queue jobs in 'data.jobs'
    // Nest won't repeat URLs that have already been scraped
    return data;
  }
});

nest.queue('hackernews-articles');

nest.start();
```

After running the example, the first worker will go to the articles feed, scrape the 30 articles in the list, store those scraped items in the database, and queue scraping jobs to those articles by their article ID. Then, it will paginate and scrape the next page of the feed.

Meanwhile, the other workers will pick the jobs in the queue, scrape the article pages, and update the article in the database by their article ID.

Remember you can find the [full example's code here](https://github.com/d-oliveros/nest-hackernews).

#### Nest will avoid scraping URLs that have already been scraped

Remember, URLs that have already been scraped _will not be scraped again_. So, if you make changes to a finite route and want to test your new route, or if you want to repeat your routes, you can delete the finished scraped URLs from the 'jobs' collection by doing:

```shell
mongo nest

# This will delete all the finished URLs
> db.jobs.remove({ 'state.finished': true })

# This will only delete finished jobs for a particular route
> db.jobs.remove({ 'state.finished': true, 'routeId': 'my-route-key' })

# WARNING: This will delete every item and job in your database
> db.dropDatabase()
```


## Engine

By default, Nest will create x amount of workers, where x is the amount of CPU cores you have. Each worker will query for an operation, sorted by priority, run that operation (and spawn a bunch of other operations), and query for another operation again.

Only 1 worker will be querying for an operation at a given time. That is to avoid having multiple workers working on the same op. If there are no unfinished operations, the worker will keep on querying for new ops every second or so.


## Tests

```
npm run test
```


Cheers.
