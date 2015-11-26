import createRoute from '../../src/route';
import { clean as removeDiacritics } from 'diacritic';

const route = createRoute({
  provider: 'reporteindigo',
  name:     'post',
  url:      'http://www.reporteindigo.com/<%= query %>',
  priority: 90,

  test: {
    query: 'reporte/mexico/paseo-de-las-carpas',
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {

  // The scraping function will return this object to Nest. Nest will then:
  // - Scrape the next page is 'hasNextPage' is true,
  // - Save the items in the 'data.items' array into a Mongo DB
  // - Scrape the new routes inside 'data.operations',
  const data = {
    items: []
  };
  const itemUrl = this.location.href;
  const itemAuthor = $('.article-author').text();

  data.items.push({
    url:       itemUrl,
    key:       itemUrl.replace('http://www.reporteindigo.com/', ''),
    name:      $('#article-title').text(),
    abstract:  $('#article-abstract').text(),
    body:      $('#rest-body').text(),
    posted:    new Date($('.article-date').text().replace(/de /g, '')),
    tag:       $('#article-topic .topic').text().substr(1),
    image:     $('#article-multimedia img').attr('src'),

    // If the author is set, remove extra text
    authors: itemAuthor ?
      itemAuthor.replace('Por ', '').replace(' -', '').split(', ') :
      undefined

  });

  return data;
};

// This will be executed before saving the items to the DB.
// You can use any module here, as this is executed in the main NodeJS process
route.middleware = function(data) {

  // We dont want accents in the tag names, so we are removing them here
  data.items.forEach((item) => item.tag = removeDiacritics(item.tag));

  return data;
};

export default route;
