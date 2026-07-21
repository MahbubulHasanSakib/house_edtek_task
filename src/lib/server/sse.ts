import { EventEmitter } from 'events';

const globalEmitter = global as any;
if (!globalEmitter.sseEmitter) {
  globalEmitter.sseEmitter = new EventEmitter();
  globalEmitter.sseEmitter.setMaxListeners(100);
}

export const sseEmitter = globalEmitter.sseEmitter as EventEmitter;
