var Route = require('../../src/Route');

var route = new Route({
  provider: 'sinembargo',
  name:     'post',
  url:      'http://www.sinembargo.mx/<%= query %>',
  priority: 90,

  // Optional: Enable an automated test for this route
  test: {
    query: '20-03-2015/1288239',
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  var data = {
    items: []
  };

  var itemUrl = this.location.href;
  var posted = $('.date').text();

  var body = $('.post_text_inner p').map(function() {
    var $p = $(this);
    return $p.text().trim();
  }).get().join('\n');

  data.items.push({
    url:       itemUrl,
    key:       itemUrl.replace('http://www.sinembargo.mx/', ''),
    name:      $('.post_text_inner h1').text(),
    body:      body,
    posted:    posted    // new Date(...) ?
  });

  return data;
};

module.exports = route;