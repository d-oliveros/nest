/* eslint-disable no-console */
import './testenv';
import { expect } from 'chai';
import Operation from '../src/Operation';
import Item from '../src/Item';
import engine from '../src/engine';
import config from '../config';

describe('Engine', function() {
  this.timeout(15000); // 15 seconds

  describe('workers', function() {

    // Clear the database
    before(clearDatabase);

    it('should start with 0 operations', () => {
      expect(engine.state.operationIds.length).to.equal(0);
    });

    it(`should start with ${config.engine.workers} workers`, () => {
      expect(engine.state.workers.length).to.equal(config.engine.workers);
    });

    // it should stop the engine
    after(async () => {
      await engine.stop();

      if (engine.state.workers.length > 0) {
        throw new Error('Engine did not removed workers.');
      }
    });
  });

  describe('concurrency', function() {

    // Clear the database
    beforeEach(clearDatabase);

    it('should respect the concurrency limit of routes', function(done) {
      const workers = config.engine.workers;

      if (workers < 2) {
        console.warn('This test requires at least 2 engine workers');
        return this.skip();
      }

      const githubSearchRoute = require('../routes/github/search');
      let runningGithubSearchRoutes = 0;
      let runningWorkers = 0;
      let finished = false;

      const checkOperation = (operation) => {
        const provider = operation.provider;
        const routeName = operation.route;

        runningWorkers++;

        if (provider === 'github' && routeName === 'search') {
          runningGithubSearchRoutes++;
        }

        check();
      };

      const onNoop = () => {
        runningWorkers = workers;
        check();
      };

      // hard-set the concurrency limit
      githubSearchRoute.concurrency = 1;

      // initialize two search routes
      githubSearchRoute.start(githubSearchRoute.test.query);
      githubSearchRoute.start(githubSearchRoute.test.query + 'test');

      // when an operation starts, this event is emitted
      engine.emitter.on('operation:start', checkOperation);

      // when there are no pending operations, this event is emitted
      engine.emitter.once('operation:noop', onNoop);

      function check() {
        if (runningWorkers < workers || finished) return;

        finished = true;

        if (runningGithubSearchRoutes > 1) {
          return done(new Error('Went over concurrency limit.'));
        }

        engine.emitter.removeListener('operation:start', checkOperation);
        engine.emitter.removeListener('operation:noop', onNoop);

        done();
      }
    });

    // it should stop the engine
    after(async () => {
      await engine.stop();

      if (engine.state.workers.length > 0) {
        throw new Error('Engine did not removed workers.');
      }
    });
  });
});

async function clearDatabase() {
  await Operation.remove();
  await Item.remove();
  engine.start();
}
