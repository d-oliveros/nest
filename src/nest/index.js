import Spider from './Spider';
import Operation from './Operation';

export default {
  async start(query, route) {
    const spider = new Spider();
    const operation = await Operation.initialize(query, route);
    spider.scrape(operation);
    return spider;
  }
};
