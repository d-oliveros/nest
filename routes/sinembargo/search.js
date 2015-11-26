import createRoute from '../../src/route';
import { clean as removeDiacritics } from 'diacritic';

export default createRoute({
  provider: 'sinembargo',
  name:     'search',
  url:      'http://www.sinembargo.mx/page/<%= state.currentPage %>?s=<%= query %>',
  priority: 80,

  scraper($) {
    const data = {
      hasNextPage: $('.next.next_last').length > 0,
      items: [],
      operations: []
    };

    // We are mapping each search result to actual, valuable information,
    // and adding the search result to the items array
    data.items = $('.post_text_inner').map(function() {
      const $item = $(this);
      let itemUrl = $item.find('a').attr('href');

      if (itemUrl[itemUrl.length - 1] === '/') {
        itemUrl = itemUrl.substr(0, itemUrl.length - 1);
      }

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
  },

  // This will be executed before saving the items to the DB.
  // You can use any module here, as this is executed in the main NodeJS process
  middleware(data) {

    // It would also be handy to save the title without accents
    data.items.forEach((item) => {
      item.nameSanitized = removeDiacritics(item.name);
    });

    return data;
  },

  test: {
    query: 'taco',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});
