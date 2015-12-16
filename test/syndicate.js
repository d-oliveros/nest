/* eslint-disable no-console */
import './testenv';
import { clone } from 'lodash';
import { expect } from 'chai';
import syndicateConfig from '../config/syndicate';
import Syndicate from '../src/syndicate';
import Queue from '../src/db/queue';
import Item from '../src/db/item';
import mockRoute from './mocks/route';
import mockModules from './mocks/modules';

const debug = require('debug')('test:syndicate');

describe('Syndicate', function() {

  beforeEach(async () => {
    await Queue.remove();
    await Item.remove();
  });

  it(`should start with ${syndicateConfig.workers} workers`, async () => {
    const syndicate = new Syndicate(mockModules);
    await syndicate.start();
    expect(syndicate.running).to.equal(true);
    expect(syndicate.runningJobIds.length).to.equal(0);
    expect(syndicate.workers.length).to.equal(syndicateConfig.workers);
    await syndicate.stop();
    expect(syndicate.running).to.equal(false);
  });

  it('should emit an event if its workers emits an event', (done) => {
    const syndicate = new Syndicate(mockModules);
    let eventCount = 0;

    syndicate.assignWorkers();

    syndicate.on('test:event', () => {
      eventCount++;

      if (eventCount === syndicateConfig.workers) {
        done();
      }
    });

    for (const worker of syndicate.workers) {
      worker.emit('test:event');
    }
  });

  it('should respect the concurrency limit of routes', function(done) {
    const syndicate = new Syndicate(mockModules);
    const route = clone(mockRoute, true);

    let runningWorkers = 0;
    let runningScrapers = 0;
    let finished = false;

    const onNoop = function() {
      debug('onNoop');
      runningWorkers++;
      check(); // eslint-disable-line
    };

    const onJobStart = function() {
      debug('onJobStart');
      runningWorkers++;
      runningScrapers++;
      check(); // eslint-disable-line
    };

    const check = function() {
      if (runningWorkers < syndicateConfig.workers || finished) return;

      syndicate.removeListener('job:start', onJobStart);
      syndicate.removeListener('job:noop', onNoop);

      finished = true;

      if (runningScrapers > 1) {
        return done(new Error('Went over concurrency limit.'));
      }

      syndicate.stop()
        .then(() => {
          if (syndicate.workers.length > 0) {
            throw new Error('Engine did not removed workers.');
          }
          done();
        })
        .catch(done);
    };

    // Create two jobs
    Queue.createJob(route.key, { query: 'dummy-query-1' }).catch(done);
    Queue.createJob(route.key, { query: 'dummy-query-2' }).catch(done);

    // when a job starts, this event is emitted
    syndicate.on('job:start', onJobStart);

    // when there are no pending jobs, this event is emitted
    syndicate.on('job:noop', onNoop);

    syndicate.start();
    expect(syndicate.running).to.equal(true);
  });
});
