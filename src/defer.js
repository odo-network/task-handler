/* @flow */
import type { Task$Ref, Task$RefMap } from './types';

function buildDeferTimeoutHandler(timeout) {
  /* TODO : Setup Tests of the setImmediate and setTimeout fallbacks */
  /* istanbul ignore else */
  if (typeof process === 'object' && typeof process.nextTick === 'function') {
    let tickCancelID = 0;
    timeout.create = function cancellableNextTick(cb) {
      tickCancelID += 1;
      const id = tickCancelID;
      process.nextTick(() => {
        if (id === tickCancelID) {
          cb();
          tickCancelID = 0;
        }
      });
    };
    timeout.cancel = function cancelNextTick() {
      tickCancelID += 1;
    };
  } else if (typeof setImmediate === 'function') {
    timeout.create = setImmediate;
    timeout.cancel = clearImmediate;
  } else {
    timeout.create = setTimeout;
    timeout.cancel = clearTimeout;
  }
  Object.freeze(timeout);
}

export default function createDeferQueue(refs: Task$RefMap) {
  const queue = new Map();
  let i = 0;
  let timerID;

  const timeout = {
    create: undefined,
    cancel: undefined,
  };

  function flush() {
    queue.forEach(([ref, cb]) => {
      // we have to delete each as we execute so that if the
      // callback schedules another execution we don't remove
      // them.
      refs.delete(ref.id);
      cb();
    });
    queue.clear();
    return handler;
  }

  const handler = Object.freeze({
    clear() {
      /* istanbul ignore else */
      if (timeout.cancel) {
        // $FlowIgnore
        timeout.cancel(timerID);
      }
      queue.clear();
    },
    cancel(deferID: any) {
      queue.delete(deferID);
      if (queue.size === 0) {
        handler.clear();
      }
    },
    add(ref: Task$Ref, cb: Function) {
      i += 1;
      const deferID = i;
      if (queue.size === 0) {
        if (!timeout.create) {
          buildDeferTimeoutHandler(timeout);
        }
        /* istanbul ignore else */
        if (timeout.create) {
          timerID = timeout.create(flush);
        } else {
          throw new Error(
            '[ERROR] | task-handler | defer failed to create a defer handler.  Internal Error.',
          );
        }
      }
      queue.set(deferID, [ref, cb]);
      return () => handler.cancel(deferID);
    },
  });

  return handler;
}
