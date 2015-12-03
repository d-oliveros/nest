import { EventEmitter } from 'events';
import { expect } from 'chai';
import { createWorker } from '../src/worker';
import { createEngine } from '../src/engine';
import Action from '../src/db/Action';
import Item from '../src/db/Item';
import mockWorker from './mocks/worker';
import mockModules from './mocks/modules';
import mockRoute from './mocks/route';

describe('Worker', function() {
  this.timeout(4000);

  beforeEach(async () => {
    await Action.remove();
    await Item.remove();
  });

  it('should emit an event', (done) => {
    const worker = createMockWorker();
    worker.on('test:event', done);
    worker.emit('test:event');
  });

  it('should add and emit events to an external emitter', (done) => {
    const worker = createMockWorker();
    const emitter = new EventEmitter();
    let completed = 0;

    worker.addEmitter(emitter);

    expect(worker.emitters.has(emitter)).to.equal(true);

    worker.once('test:event', () => completed++);
    emitter.once('test:event', () => completed++);

    worker.emit('test:event');

    setTimeout(() => {
      if (completed !== 2) {
        return done(new Error('Emitter did not received event'));
      }

      done();
    }, 100);
  });

  it('should remove external emitter', () => {
    const worker = createMockWorker();
    const emitter = new EventEmitter();

    worker.addEmitter(emitter);
    expect(worker.emitters.has(emitter)).to.equal(true);

    worker.removeEmitter(emitter);
    expect(worker.emitters.has(emitter)).to.equal(false);
    expect(worker.emitters.size).to.equal(0);
  });

  it('should start a worker', async () => {
    const worker = createMockWorker();
    expect(worker.running).to.equal(false);
    await worker.start();
    expect(worker.running).to.equal(true);
  });

  it('should start and stop the worker loop', (done) => {
    const worker = createMockWorker();
    const maxNoops = 2;
    let noopCount = 0;

    worker.on('action:noop', async () => {
      noopCount++;

      if (noopCount === maxNoops) {
        await worker.stop();
        done();
      }
    });

    worker.start();
  });

  it('should run an action', async () => {
    const worker = createMockWorker();
    const action = await Action.findOrCreate(mockRoute);

    worker.running = true;

    const newAction = await worker.startAction(action);

    expect(newAction.state.finished).to.equal(true);
    expect(newAction.stats.items).to.be.greaterThan(20);
  });
});

function createMockWorker() {
  const engine = createMockEngine();
  return createWorker(engine, mockWorker);
}

function createMockEngine() {
  return createEngine(mockModules);
}
