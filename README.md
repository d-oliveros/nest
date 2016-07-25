
Nest
==============

Nest is a scraping framework. Nest supports dynamic scraping with PhantomJS, static scraping (without PhantomJS and JS evaluation), a scraping worker queue for persistent parallel scraping, automated scraping tests, a CLI, and a dead-simple API for scraping pages.


## Requirements

  * MongoDB


## Installation

```
npm install nest
```


## Usage

TODO


## Example: Scraping HackerNews

In this example, we will scrape the first 5 pages of hackernews:

```js
var Nest = require('nest');

var nest = new Nest();

nest.addRoute({

  // This is the route ID
  key: 'hackernews-homepage',

  // This is the URL pattern that belongs to this "route"
  url: 'https://news.ycombinator.com',

  // This is the scraper function. The HTML page is already loaded
  // in cheerio, letting you scrape as if you were using jQuery.
  //
  // You should return an object with the following properties:
  // - items:       `Array` Items to save in the database.
  // - jobs:        `Array` New scraping jobs to add to the scraper worker queue
  // - hasNextPage: `Boolean` If true, Nest will scrape the next page
  //
  scraper($) {
    const items = $('tr.athing').map((i, row) => {
      return {
        title: $(row).find('a.storylink').text(),
        href: $(row).find('a.storylink').attr('href'),
        postedBy: $(row).find('a.hnuser').text(),

        // this is the only required property in an item object
        // the key represents the item's ID
        key: $(row).attr('id')
      };
    }).get();

    // we're only interested in saving the scraped items in the DB
    return {
      items: items
    };
  }
});

nest.addAction('hackernews-homepage');

nest.start();
```

TODO


## Tests

```
npm run test
```


Cheers.
