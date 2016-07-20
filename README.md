
Nest
==============

Nest is a scraping framework. Nest supports dynamic scraping with PhantomJS, static scraping (without PhantomJS and JS evaluation), a scraping worker queue for persistent parallel scraping, automated scraping tests, a CLI, and a dead-simple API for scraping pages.


## Requirements

  * MongoDB


## Installation

```
npm install -g nest
```


## Usage

(CLI info)


## Tutorial: Scraping HackerNews!

In this guide, we will scrape the first 5 pages of hackernews.

Let's start by creating our initial Nest project by using the "nest init" command.

```bash
# This will create a folder called "hackernews"
nest init hackernews
```

This will create a folder with the following structure:
```
|- routes/
```

We need to tell Nest which routes we want to scrape, and what information we want to take from those pages. We can do so by creating a new route.

Create a file in the routes directory. Let's call it "homepage.js":

```js
// in routes/homepage.js

module.exports = {

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
  scraper: ($) => {
    const items = $('tr.athing').map((i, row) => {
      return {
        title: $(link).text(),
        href: $(row).find('a.storylink').attr('href')
        postedBy: $(row).find('a.hnuser').text(),

        // this is the only required property in an item object
        // the key represents the item's ID
        key: $(row).attr('id'),
      };
    });

    // we're only interested in saving the scraped items in the DB
    return {
      items: items
    };
  }
};
```

And that's it! Now try listing your new route in Nest by doing:

```bash
nest list
```

You should

make your route available in `nest list`, and to start scraping the website by doing `nest scrape [routeId]`.
The `[routeId]` is composed of `[routeDomain]:[routeName]`. In this examples, that is `wikipedia:post`.
