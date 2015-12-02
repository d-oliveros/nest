/* eslint-disable no-console */
import './testenv';
import { expect } from 'chai';
import { clone } from 'lodash';
import Action from '../src/db/Action';
import Item from '../src/db/Item';
import createSpider from '../src/spider';
import createEngine from '../src/engine';
import createWorker from '../src/worker';
import config from '../config';
import routeMock from './mocks/route';

const debug = require('debug')('test:engine');
const engine = createEngine({
  routes: [routeMock],
  plugins: [],
  workers: []
});

describe('Engine', function() {
  this.timeout(1500);

  describe('workers', function() {

    before(async () => {
      await Action.remove();
      await Item.remove();
      await engine.start();
    });

    it('should start with 0 actions', () => {
      expect(engine.getRunningActionIds().length).to.equal(0);
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
      await Action.remove();
      await Item.remove();
    });

    it('should respect the concurrency limit of routes', function(done) {
      const route = clone(routeMock, true);
      const workers = 3;

      let runningWorkers = 0;
      let runningScrapers = 0;
      let finished = false;

      // hard-set the concurrency limit
      route.concurrency = 1;

      // initialize two search routes
      startAction(route.test.query, route).catch(done);
      startAction(route.test.query + ' test', route).catch(done);

      // when an action starts, this event is emitted
      engine.on('action:start', onActionStart);

      // when there are no pending actions, this event is emitted
      engine.on('action:noop', onNoop);

      engine.start();

      function onNoop() {
        debug('onNoop');
        runningWorkers++;
        check();
      }

      function onActionStart() {
        debug('onActionStart');
        runningWorkers++;
        runningScrapers++;
        check();
      }

      function check() {
        if (runningWorkers < workers || finished) return;

        engine.removeListener('action:start', onActionStart);
        engine.removeListener('action:noop', onNoop);
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

async function startAction(query, route) {
  const spider = createSpider();
  const action = await Action.findOrCreate(route, query);
  return await spider.scrape(action, {
    routes: [routeMock],
    plugins: []
  });
}
