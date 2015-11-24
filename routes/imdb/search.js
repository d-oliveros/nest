import Route from '../../src/Route';

const route = new Route({
  provider: 'imdb',
  name:  'search',
  url:   'http://www.imdb.com/search/title?at=0&count=100&sort=num_votes&start=<%= (1 +((state.currentPage-1) * 100)) %>&title_type=feature,tv_movie',
  priority: 80,
  test: {
    shouldCreateItems:  true,
    shouldSpawnOperations: false
  }
});

route.scraper = function($) {
  const data = {
    hasNextPage: $('.pagination a').length > 0,
    items: [],
    operations: []
  };

  const $items = $('table.results tr');

  $items.each(function() {
    const $item = $(this);

    const item = {
      type: 'movie'
    };

    // Get the movie ID
    $item.find('.title a').each(function() {
      const href = $(this).attr('href');

      if (href && href.indexOf('/title/') === 0) {
        item.name = $(this).text();
        item.key = href.replace(/(\/)(title)?/g, '').split('vote?')[0];
        item.link = 'http://www.imdb.com/title/' + item.key;
      }
    });

    // Get the director
    const hasDirector = $item.find('.credit').text().indexOf('Dir') > -1;
    const $director = $item.find('.credit a').first();

    if (hasDirector) {
      item.directorId = $director.attr('href').replace(/(\/)(name)?/g, '');
      item.directorName = $director.text();
    }

    // Get metadata
    item.year = $item.find('.year_type').text().replace('(', '').replace(')', '');
    item.rating = $item.find('.rating-rating .value').text();
    item.outline = $item.find('.outline').text().trim();

    item.userRatings = $item.find('.sort_col').text().replace(/,/g, '');

    item.genres = $item.find('.genre a').map(function() {
      return $(this).attr('href').replace('/genre/', '');
    }).get();

    if (item.key) {
      data.items.push(item);
    }
  });

  return data;
};

export default route;
