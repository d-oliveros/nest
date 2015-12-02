import { EventEmitter } from 'events';
import inspect from 'util-inspect';

const debug = require('debug')('emitter');

/**
 * Event Emitter with chainable emitters support.
 */
const Emitter = {

  /**
   * Adds an external EventEmitter
   * @param {Object}  emitter  Event emitter to add
   */
  addEmitter(emitter) {
    this.emitters.add(emitter);
  },


  /**
   * Removes an EventEmitter
   * @param  {Object}  emitter  Emitter to remove
   */
  removeEmitter(emitter) {
    this.emitters.delete(emitter);
  },

  /**
   * Emits an event through self and attached emitters.
   * @override EventEmitter.prototype.emit
   */
  emit() {
    const args = Array.prototype.slice.call(arguments);

    // emit the event through own emitter
    EventEmitter.prototype.emit.apply(this, args);

    debug(`Emitting ${inspect(args)}`);

    // emit the event through all the attached emitters
    this.emitters.forEach((emitter) => {
      emitter.emit(args);
    });
  }
};

/**
 * Creates a new emitter instance, or initializes an existing emitter
 * @param  {Object}  emitter  Base emitter instance. Optional.
 * @return {Object}           Initialized emitter instance.
 */
const createEmitter = function(emitter) {
  emitter = emitter || Object.create(Emitter);

  emitter = Object.assign(emitter, EventEmitter.prototype, {
    emitters: new Set(),
    emit: Emitter.emit
  });

  EventEmitter.call(emitter);

  return emitter;
};

export { Emitter as emitterProto, createEmitter };
