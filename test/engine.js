/* eslint-disable no-console, import/imports-first */
import './testenv';
import { clone } from 'lodash';
import { expect } from 'chai';
import engineConfig from '../config/engine';
import Engine from '../src/engine';
import Queue from '../src/db/queue';
import Item from '../src/db/item';
import mockRoute from './mocks/route';
import mockModules from './mocks/modules';

const debug = require('debug')('test:engine');

describe('Engine', () => {

  beforeEach(async () => {
    await Queue.remove();
    await Item.remove();
  });

  it(`should start with ${engineConfig.workers} workers`, async () => {
    const engine = new Engine(mockModules);
    await engine.start();
    expect(engine.running).to.equal(true);
    expect(engine.runningJobIds.length).to.equal(0);
    expect(engine.workers.length).to.equal(engineConfig.workers);
    await engine.stop();
    expect(engine.running).to.equal(false);
  });

  it('should emit an event if its workers emits an event', (done) => {
    const engine = new Engine(mockModules);
    let eventCount = 0;

    engine.assignWorkers();

    engine.on('test:event', () => {
      eventCount++;

      if (eventCount === engineConfig.workers) {
        done();
      }
    });

    for (const worker of engine.workers) {
      worker.emit('test:event');
    }
  });

  it('should respect the concurrency limit of routes', (done) => {
    const engine = new Engine(mockModules);
    const route = clone(mockRoute, true);

    let runningWorkers = 0;
    let runningScrapers = 0;
    let finished = false;

    const onNoop = () => {
      debug('onNoop');
      runningWorkers++;
      check(); // eslint-disable-line
    };

    const onJobStart = () => {
      debug('onJobStart');
      runningWorkers++;
      runningScrapers++;
      check(); // eslint-disable-line
    };

    const check = () => {
      if (runningWorkers < engineConfig.workers || finished) return;

      engine.removeListener('job:start', onJobStart);
      engine.removeListener('job:noop', onNoop);

      finished = true;

      if (runningScrapers > 1) {
        return done(new Error('Went over concurrency limit.'));
      }

      engine.stop()
        .then(() => {
          if (engine.workers.length > 0) {
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
    engine.on('job:start', onJobStart);

    // when there are no pending jobs, this event is emitted
    engine.on('job:noop', onNoop);

    engine.start();
    expect(engine.running).to.equal(true);
  });
});
