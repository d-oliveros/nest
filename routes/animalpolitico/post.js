import Route from '../../src/Route';

const route = new Route({
  provider: 'animalpolitico',
  name:     'post',
  url:      'http://www.animalpolitico.com/<%= query %>',
  priority: 90,

  // Optional: Enable an automated test for this route
  test: {
    query: '2010/08/suprema-corte-avala-matrimonios-gay-en-el-df',
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  const data = {
    items: []
  };

  const itemUrl = this.location.href;
  // const posted = $('.entry-date').text().trim();

  // Clear the body
  $('.entry-content a').remove();
  $('.entry-content div').remove();

  const body = $('.entry-content p').map(function() {
    const $p = $(this);
    return $p.text().trim();
  }).get().join('\n');

  data.items.push({
    url:       itemUrl,
    key:       itemUrl.replace('http://www.animalpolitico.com/', ''),
    name:      $('.entry-title').text(),
    body:      body
    // posted:    new Date($('.article-date').text().replace(/de /g, '')),
  });

  return data;
};

export default route;
