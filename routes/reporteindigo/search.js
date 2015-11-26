import Route from '../../src/Route';
import { clean as removeDiacritics } from 'diacritic';

const route = new Route({
  provider: 'reporteindigo',
  name:     'search',
  url:      'http://www.reporteindigo.com/search/apachesolr_search/<%= query %>?page=<%= state.currentPage - 1 %>',
  priority: 80,

  test: {
    query: 'taxi',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {

  // The scraping function will return this object to Nest. Nest will then:
  // - Scrape the next page is 'hasNextPage' is true,
  // - Save the items in the 'data.items' array into a Mongo DB
  // - Scrape the new routes inside 'data.operations',
  const data = {
    hasNextPage: $('.pager-next a').length > 0,
    items: [],
    operations: []
  };

  // We are mapping each search result to actual, valuable information,
  // and adding the search result to the items array
  data.items = $('.search-result').map(function() {
    const $item = $(this);
    const itemUrl = $item.find('a.search-result-title').attr('href');

    return {
      name:  $item.find('.search-result-title').text(),
      key:   itemUrl.replace('http://www.reporteindigo.com/', ''),
      url:   itemUrl,
      image: $item.find('.search-result-thumb img').attr('src'),
      tag:   $item.find('.search-result-kicker').text().substr(1)
    };
  }).get();

  // We also want to scrape each new post to get the full post's information
  data.operations = data.items.map(function(item) {
    return {
      provider: 'reporteindigo',
      route:    'post',
      query:    item.key
    };
  });

  return data;
};

// This will be executed before saving the items to the DB.
// You can use any module here, as this is executed in the main NodeJS process
route.middleware = function(data) {

  data.items.forEach((item) => {

    // We dont want accents in the tag names, so we are removing them here
    item.tag = removeDiacritics(item.tag);

    // It would also be handy to save the title without accents
    item.nameSanitized = removeDiacritics(item.name);
  });

  return data;
};

export default route;
