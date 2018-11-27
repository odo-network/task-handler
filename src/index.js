/* @flow */
import type { Task$Instance } from './types';
import {
  NOOP,
  EXECUTE_RESULT,
  TASK_CANCELLED,
  STATIC_EMPTY_ARRAY,
} from './constants';

import createDeferQueue from './defer';

function createTaskRef<+ID: any, +H: Task$Instance>(
  id: ID,
  handler: H,
  isAsyncIterator?: boolean,
  jobDescriptor?: [Function, Array<*>],
): Task$Ref {
  handler.cancel(id);
  let promiseFn;
  let promise;
  let promiseActions;
  let lastResult;
  let job;

  const getNextPromise = () => promise
    || do {
      promise = new Promise((resolve, reject) => {
        promiseActions = [resolve, reject];
      });
    };

  const ref: Task$Ref = {
    get result() {
      if (ref.status.complete) {
        return lastResult;
      }
      return undefined;
    },
    get promise() {
      if (isAsyncIterator) {
        return async function* promiseIterator() {
          try {
            while (true) {
              if (ref.status.complete) {
                break;
              }
              getNextPromise();
              // eslint-disable-next-line no-await-in-loop
              await promise;
              yield ref;
              promiseActions = undefined;
              promise = undefined;
            }
            return ref;
          } finally {
            promiseActions = undefined;
            promise = undefined;
          }
        };
      }
      if (promise) {
        return () => promise;
      }
      promiseFn = promiseFn
        || async function promisedResult() {
          try {
            if (ref.status.complete) {
              return ref;
            }
            getNextPromise();
            await promise;
            return ref;
          } catch (e) {
            ref.status.error = true;
            lastResult = e;
            throw e;
          } finally {
            promiseActions = undefined;
            promise = undefined;
          }
        };
      return promiseFn;
    },
    status: {
      complete: false,
      error: false,
      cancelled: false,
    },
    [TASK_CANCELLED](promises) {
      if (ref.status.complete) {
        return;
      }
      lastResult = TASK_CANCELLED;
      ref.status.cancelled = true;
      ref.status.complete = true;
      if (promise) {
        promiseActions[0](ref);
      }
      if (job) {
        /* istanbul ignore else */
        if (typeof job.cancelled === 'function') {
          promises.push(job.cancelled());
        } else if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[WARN] | task-handler | Async Job "${id}" was cancelled but provided no "cancelled" handler.`,
          );
        }
      }
    },
    [EXECUTE_RESULT](err, result) {
      if (!ref.status.complete) {
        lastResult = result;
        if (!isAsyncIterator) {
          ref.status.complete = true;
        }
        if (promise) {
          if (err) {
            const error = typeof err === 'object' ? err : new Error(err);
            error.taskRef = ref;
            return promiseActions[1](error);
          }
          return promiseActions[0](ref);
        }
      }
    },
    id,
    task: handler,
    resolve(result) {
      return ref[EXECUTE_RESULT](undefined, result);
    },
    reject(err) {
      return ref[EXECUTE_RESULT](err);
    },
    cancel() {
      lastResult = TASK_CANCELLED;
      ref.status.cancelled = true;
      handler.cancel(id);
    },
  };

  if (jobDescriptor) {
    job = jobDescriptor[0].apply(ref, jobDescriptor[1]);
    ref.promise().catch(NOOP);
    job.start.call(ref, ref);
  }

  return Object.freeze(ref);
}

export default function createTaskHandler() {
  const refs: Map<any, [Task$Ref, () => void]> = new Map();
  let queue;

  function getQueue() {
    if (queue) {
      return queue;
    }
    queue = createDeferQueue(refs);
    return queue;
  }

  function cancelID(id: any, promises: Array<any>): void {
    if (!refs.has(id)) return;
    const [ref, canceller] = refs.get(id);
    canceller();
    refs.delete(id);
    ref[TASK_CANCELLED](promises);
  }

  function execute(ref, fn, args = STATIC_EMPTY_ARRAY) {
    try {
      const result = typeof fn === 'function' ? fn(ref, ...args) : undefined;
      ref[EXECUTE_RESULT](undefined, result);
    } catch (e) {
      ref[EXECUTE_RESULT](e);
    }
  }

  const handler = Object.freeze({
    get size(): number {
      return refs.size;
    },
    after<+ID: any, +A: Array<*>>(
      id: ID,
      delay: number,
      fn?: ((...A) => any) | A,
      args?: A,
    ): Task$Ref {
      const ref = createTaskRef(id, handler);
      const timeoutID = setTimeout(execute, delay, ref, fn, args);
      refs.set(id, [ref, () => clearTimeout(timeoutID)]);
      return ref;
    },
    defer<+ID: any, +A: Array<*>>(
      id: ID,
      fn?: (...A) => any,
      args?: A,
    ): Task$Ref {
      const ref = createTaskRef(id, handler);
      const cancelDefer = getQueue().add(ref, () => execute(ref, fn, args));
      refs.set(id, [ref, () => cancelDefer()]);
      return ref;
    },
    every<+ID: any, +A: Array<*>>(
      id: ID,
      interval: number,
      fn?: (...A) => any,
      args?: A,
    ): Task$Ref {
      const ref = createTaskRef(id, handler, true);
      const timerID = setInterval(execute, interval, ref, fn, args);
      refs.set(id, [ref, () => clearInterval(timerID)]);
      return ref;
    },
    everyNow<+ID: any, +A: Array<any>>(
      id: ID,
      interval: number,
      fn?: (...A) => any,
      args?: A,
    ): Task$Ref {
      const ref = createTaskRef(id, handler, true);
      const timerID = setInterval(execute, interval, ref, fn, args);
      const cancelDefer = getQueue().add(id, () => execute(ref, fn, args));
      refs.set(id, [
        ref,
        () => {
          clearInterval(timerID);
          cancelDefer();
        },
      ]);
      return ref;
    },
    job<+ID: any, +A: Array<*>>(
      id: ID,
      getJob: (...A) => any,
      args?: A = STATIC_EMPTY_ARRAY,
    ) {
      const ref = createTaskRef(id, handler, false, [getJob, args]);
      refs.set(id, [ref, NOOP]);
      return ref;
    },
    cancel(...ids: Array<any>) {
      const promises = [];
      ids.forEach(id => cancelID(id, promises));
      return {
        promise() {
          return Promise.all(promises);
        },
      };
    },
    clear() {
      return handler.cancel(...Array.from(refs.keys()));
    },
  });

  return handler;
}
