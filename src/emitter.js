import { EventEmitter } from 'events';

const debug = require('debug')('emitter');

/**
 * Creates a new emitter instance, or initializes an existing emitter
 * @param  {Object}  emitter  Base emitter instance. Optional.
 * @return {Object}           Initialized emitter instance.
 */
export function createChainableEmitter(emitter) {
  emitter = emitter || Object.create(chainableEmitterProto);

  emitter = Object.assign(emitter, EventEmitter.prototype, {
    emitters: new Set(),
    emit: chainableEmitterProto.emit
  });

  EventEmitter.call(emitter);

  return emitter;
}

/**
 * Event Emitter with chainable emitters support.
 */
export const chainableEmitterProto = {

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
  emit(...args) {

    // emit the event through own emitter
    EventEmitter.prototype.emit.apply(this, args);

    debug('Emitting', args);

    // emit the event through all the attached emitters
    this.emitters.forEach((emitter) => {
      emitter.emit(...args);
    });
  }
};
