var Route = require('../../src/Route');
var removeDiacritics = require('diacritic').clean;

var route = new Route({
  provider: 'sinembargo',
  name:     'search',
  url:      'http://www.sinembargo.mx/page/<%= state.currentPage %>?s=<%= query %>',
  priority: 80,

  test: {
    query: 'taco',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});

route.scraper = function($) {
  var data = {
    hasNextPage: $('.next.next_last').length > 0,
    items: [],
    operations: []
  };

  // We are mapping each search result to actual, valuable information,
  // and adding the search result to the items array
  data.items = $('.post_text_inner').map(function() {
    var $item = $(this);
    var itemUrl = $item.find('a').attr('href');

    if (itemUrl[itemUrl.length-1] === '/')
      itemUrl = itemUrl.substr(0, itemUrl.length-1);

    return {
      name:  $item.find('a').attr('title'),
      key:   itemUrl.replace('http://www.sinembargo.mx/', ''),
      url:   itemUrl
    };
  }).get();

  data.operations = data.items.map(function(item) {
    return {
      provider: 'sinembargo',
      route:    'post',
      query:    item.key
    };
  });

  return data;
};

// This will be executed before saving the items to the DB.
// You can use any module here, as this is executed in the main NodeJS process
route.middleware = function(data, callback) {

  data.items.forEach(function(item) {

    // It would also be handy to save the title without accents
    item.nameSanitized = removeDiacritics(item.name);
  });

  callback(null, data);
};

module.exports = route;