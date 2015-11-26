import createRoute from '../../src/route';

export default createRoute({

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
    shouldCreateItems: true, // Are we expecting new items saved to the db?
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
    const data = {
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
