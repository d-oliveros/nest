import createRoute from '../../src/route';

export default createRoute({
  key: 'hackernews',
  url: 'https://news.ycombinator.com',
  concurrency: 1,

  scraper($) {
    const items = $('.athing').map((i, node) => ({ key: $(node).attr('id') })).get();
    return { items };
  }
});
