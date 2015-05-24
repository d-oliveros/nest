var Route = require('../../lib/route');

var route = new Route({
  provider: 'periodicoabc',
  name:     'post',
  url:      'http://www.periodicoabc.mx/<%= query %>',
  priority: 90,

  // Optional: Enable an automated test for this route
  test: {
    query: 'noticias/deportes/2015/03/impresiona-estadio-rayado-al-piojo-herrera.php',
    shouldCreateItems: true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  var data = {
    items: []
  };

  var itemUrl = this.location.href;

  $('article.media').remove();

  data.items.push({
    name: $('.main h1').text(),
    body: $('.main article p').text(),
    url:   itemUrl,
    key:   itemUrl.replace('http://www.periodicoabc.mx/', '')
  });

  return data;
};

module.exports = route;
