/* @flow */

function buildDeferTimeoutHandler(timeout) {
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
}

export default function createDeferQueue(refs) {
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
      if (timeout.cancel) {
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
    add(ref, cb) {
      i += 1;
      const deferID = i;
      if (queue.size === 0) {
        if (!timeout.create) {
          buildDeferTimeoutHandler(timeout);
        }
        timerID = timeout.create(flush);
      }
      queue.set(deferID, [ref, cb]);
      return () => handler.cancel(deferID);
    },
  });

  return handler;
}
