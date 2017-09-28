import createRoute from '../../src/route';

export default createRoute({
  key: 'hackernews',
  url: 'https://news.ycombinator.com',
  concurrency: 1,

  scraper($) {
    const titles = $('.title a').map((i, node) => $(node).text()).get();
    const items = titles.map((title) => ({ key: title }));
    return { items };
  },
});
