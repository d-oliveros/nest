/* eslint-disable no-console */
import './testenv';
import { expect } from 'chai';
import Operation from '../src/Operation';
import Item from '../src/Item';
import createSpider from '../src/spider';
import createEngine from '../src/engine';
import config from '../config';
import routes from '../routes';
import plugins from '../plugins';

const debug = require('debug')('test:engine');
const engine = createEngine(routes, plugins);

describe('Engine', function() {
  this.timeout(1500);

  describe('workers', function() {

    before(async () => {
      await Operation.remove();
      await Item.remove();
      await engine.start();
    });

    it('should start with 0 operations', () => {
      expect(engine.getRunningOperationIds().length).to.equal(0);
    });

    it(`should start with ${config.engine.workers} workers`, () => {
      expect(engine.workers.length).to.equal(config.engine.workers);
    });

    // it should stop the engine
    after(async () => {
      await engine.stop();

      if (engine.workers.length > 0) {
        throw new Error('Engine did not removed workers.');
      }
    });
  });

  describe('concurrency', function() {

    beforeEach(async () => {
      await Operation.remove();
      await Item.remove();
    });

    it('should respect the concurrency limit of routes', function(done) {
      const route = require('../routes/github/search').default;
      const workers = 3;

      let runningWorkers = 0;
      let runningScrapers = 0;
      let finished = false;

      // hard-set the concurrency limit
      route.concurrency = 1;

      // initialize two search routes
      startOperation(route.test.query, route).catch(done);
      startOperation(route.test.query + ' test', route).catch(done);

      // when an operation starts, this event is emitted
      engine.on('operation:start', onOperationStart);

      // when there are no pending operations, this event is emitted
      engine.on('operation:noop', onNoop);

      engine.start();

      function onNoop() {
        debug('onNoop');
        runningWorkers++;
        check();
      }

      function onOperationStart() {
        debug('onOperationStart');
        runningWorkers++;
        runningScrapers++;
        check();
      }

      function check() {
        if (runningWorkers < workers || finished) return;

        engine.removeListener('operation:start', onOperationStart);
        engine.removeListener('operation:noop', onNoop);
        finished = true;

        if (runningScrapers > 1) {
          return done(new Error('Went over concurrency limit.'));
        }

        done();
      }
    });

    // it should stop the engine
    after(async () => {
      await engine.stop();
      if (engine.workers.length > 0) {
        throw new Error('Engine did not removed workers.');
      }
    });
  });
});

async function startOperation(query, route) {
  const spider = createSpider();
  const operation = await Operation.findOrCreate(query, route);
  return await spider.scrape(operation, { routes, plugins });
}
