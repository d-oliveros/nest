import async from 'async';
import { noop } from 'lodash';
import Worker from './worker';
import config from '../../config';
import emitter from './emitter';
import state from './state';

let started = false;

export default { emitter, state, start, stop, started };

function start() {
  if (!started) {
    for (let i = 0, len = config.engine.workers; i < len; i++) {
      const worker = new Worker();
      worker.addEmitter(emitter);
      state.workers.push(worker);
    }
    started = true;
  }
}

function stop(callback = noop) {
  async.each(state.workers, stopWorker, () => {
    started = false;
    state.workers = [];
    callback();
  });
}

function stopWorker(worker, callback) {
  worker.stop(callback);
}
