/* eslint-disable no-console */
import './testenv';
import { clone } from 'lodash';
import { expect } from 'chai';
import engineConfig from '../config/engine';
import { createEngine } from '../src/engine';
import Action from '../src/db/Action';
import Item from '../src/db/Item';
import mockRoute from './mocks/route';
import mockModules from './mocks/modules';

const debug = require('debug')('test:engine');

describe('Engine', function() {

  beforeEach(async () => {
    await Action.remove();
    await Item.remove();
  });

  it(`should start with ${engineConfig.workers} workers`, async () => {
    const engine = createEngine(mockModules);
    await engine.start();
    expect(engine.running).to.equal(true);
    expect(engine.getRunningActionIds().length).to.equal(0);
    expect(engine.workers.length).to.equal(engineConfig.workers);
    await engine.stop();
    expect(engine.running).to.equal(false);
  });

  it('should emit an event if its workers emits an event', (done) => {
    const engine = createEngine(mockModules);
    let eventCount = 0;

    engine.initialize();

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

  it('should respect the concurrency limit of routes', function(done) {
    const engine = createEngine(mockModules);
    const route = clone(mockRoute, true);

    let runningWorkers = 0;
    let runningScrapers = 0;
    let finished = false;

    const onNoop = function() {
      debug('onNoop');
      runningWorkers++;
      check(); // eslint-disable-line
    };

    const onActionStart = function() {
      debug('onActionStart');
      runningWorkers++;
      runningScrapers++;
      check(); // eslint-disable-line
    };

    const check = function() {
      if (runningWorkers < engineConfig || finished) return;

      engine.removeListener('action:start', onActionStart);
      engine.removeListener('action:noop', onNoop);

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

    // initialize two search routes
    Action.findOrCreate(route, 'dummy-query-1').catch(done);
    Action.findOrCreate(route, 'dummy-query-2').catch(done);

    // when an action starts, this event is emitted
    engine.on('action:start', onActionStart);

    // when there are no pending actions, this event is emitted
    engine.on('action:noop', onNoop);

    engine.start();
    expect(engine.running).to.equal(true);
  });
});
