import async from 'async';
import {noop} from 'lodash';
import Worker from './worker';
import config from '../../config';
import engineEmitter from './emitter';
import engineState from './state';

let engine = {
  emitter: engineEmitter,
  state:   engineState,
  start:   startEngine,
  stop:    stopEngine,
  started: false
};

export default engine;

function startEngine() {

  if (!this.started) {
    for (let i = 0, len = config.engine.workers; i < len; i++) {
      let worker = new Worker();
      worker.addEmitter(engine.emitter);
      engine.state.workers.push(worker);
    }
    this.started = true;
  }
}

function stopEngine(callback=noop) {
  async.each(engine.state.workers, stopWorker, () => {
    engine.started = false;
    engine.state.workers = [];
    callback();
  });
}

function stopWorker(worker, callback) {
  worker.stop(callback);
}
