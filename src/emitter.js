import { EventEmitter } from 'events';

/**
 * Event Emitter with chainable emitters support.
 */
const baseProto = {
  emitters: null,

  // adds an external EventEmitter
  addEmitter(emitter) {
    this.emitters.add(emitter);
  },

  // removes an EventEmitter
  removeEmitter(emitter) {
    this.emitters.delete(emitter);
  },

  // @override EventEmitter.prototype.emit
  emit() {
    const args = Array.prototype.slice.call(arguments);

    // emit the event through own emitter
    EventEmitter.prototype.emit.apply(this, args);

    // emit the event through all the attached emitters
    this.emitters.forEach((emitter) => {
      emitter.emit(args);
    });
  }
};

export const emitterProto = Object.assign({}, EventEmitter.prototype, baseProto);

export default function createEmitter(emitter) {
  emitter = emitter || Object.create(emitterProto);
  emitter.emitters = new Set();

  EventEmitter.call(emitter);

  return emitter;
}
