import { EventEmitter } from 'events';
import { expect } from 'chai';
import createWorker from '../src/worker';
import Nest from '../src/nest';
import Queue from '../src/db/queue';
import Item from '../src/db/item';
import createMongoConnection from '../src/db/connection';
import mockWorker from './mocks/worker';
import mockModules from './mocks/modules';
import mockRoute from './mocks/route';

describe('Worker', function () {
  this.timeout(6000);

  before(() => {
    createMongoConnection();
  });

  beforeEach(async () => {
    await Queue.remove();
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

    worker.once('test:event', () => { completed += 1; });
    emitter.once('test:event', () => { completed += 1; });

    worker.emit('test:event');

    setTimeout(() => {
      if (completed !== 2) {
        done(new Error('Emitter did not received event'));
        return;
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

    worker.on('job:noop', async () => {
      noopCount += 1;

      if (noopCount === maxNoops) {
        await worker.stop();
        done();
      }
    });

    worker.start();
  });

  it('should run a job', async () => {
    const worker = createMockWorker();
    let job = await Queue.createJob(mockRoute.key);

    worker.running = true;

    job = await worker.startJob(job);

    expect(job.state.finished).to.equal(true);
    expect(job.stats.items).to.be.greaterThan(20);
  });
});

function createMockWorker() {
  const engine = createMockNest();
  return createWorker(engine, mockWorker);
}

function createMockNest() {
  return new Nest(mockModules);
}
