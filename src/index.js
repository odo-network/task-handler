/* @flow */
import type {
  Task$Types,
  Task$Handler,
  Task$Ref,
  Task$RefMap,
  Task$Job,
} from './types';

import {
  NOOP,
  EXECUTE_RESULT,
  TASK_CANCELLED,
  STATIC_EMPTY_ARRAY,
} from './constants';

import createDeferQueue from './defer';

function createTaskRef<+ID: any, +A: Array<any>>(
  type: Task$Types,
  id: ID,
  handler: Task$Handler,
  jobDescriptor?: [(...args: A) => Task$Job, A, Task$RefMap],
): Task$Ref {
  handler.cancel(id);
  let promise: void | Promise<Task$Ref>;
  let promiseActions;
  let lastResult;
  let job: Task$Job;

  const getNextPromise = () => {
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      promiseActions = [resolve, reject];
    });
    return promise;
  };

  const ref: Task$Ref = {
    get result() {
      if (ref.status.complete) {
        return lastResult;
      }
      return undefined;
    },
    get promise() {
      return async function promisedResult(): Promise<Task$Ref> {
        let instancePromise;
        try {
          if (ref.status.complete) {
            if (ref.status.error) {
              throw lastResult;
            }
            return ref;
          }
          instancePromise = getNextPromise();
          await instancePromise;
          return ref;
        } finally {
          if (instancePromise === promise) {
            promiseActions = undefined;
            promise = undefined;
          }
        }
      };
    },
    get promises() {
      if (type !== 'every') {
        throw new Error(
          `[ERROR] | task-handler | "ref.promises()" may only be used with iterative tasks such as every and everyNow, but tried with "${type}" task with ID: "${id}"`,
        );
      }
      return async function* promiseIterator(): AsyncGenerator<
        Task$Ref,
        Task$Ref,
        *,
        > {
        let instancePromise;
        try {
          while (!ref.status.complete) {
            instancePromise = getNextPromise();
            // eslint-disable-next-line no-await-in-loop
            await instancePromise;
            yield ref;
            if (instancePromise === promise) {
              promiseActions = undefined;
              promise = undefined;
            }
          }
          return ref;
        } finally {
          if (instancePromise === promise) {
            promiseActions = undefined;
            promise = undefined;
          }
        }
      };
    },
    status: {
      resolving: false,
      complete: false,
      error: false,
      cancelled: false,
    },
    // $FlowIgnore
    [TASK_CANCELLED](promises) {
      if (ref.status.complete || ref.status.resolving) {
        return;
      }
      ref.status.complete = true;
      if (ref.status.error === false) {
        lastResult = TASK_CANCELLED;
        ref.status.cancelled = true;
        if (promiseActions) {
          promiseActions[0](ref);
        }
        if (job) {
          /* istanbul ignore else */
          if (typeof job.cancelled === 'function') {
            promises.push(job.cancelled.call(ref, ref));
          } else if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `[WARN] | task-handler | Async Job "${id}" was cancelled but provided no "cancelled" handler.`,
            );
          }
        }
      }
    },
    // $FlowIgnore
    [EXECUTE_RESULT](err, result) {
      if (!ref.status.complete) {
        lastResult = result;
        if (ref.type !== 'every') {
          ref.status.complete = true;
        }
        if (promiseActions) {
          if (err) {
            ref.status.error = true;
            const error: { taskRef?: Task$Ref } & Error = typeof err === 'object' ? err : new Error(err);
            error.taskRef = ref;
            lastResult = error;
            ref.cancel();
            return promiseActions[1](error);
          }
          return promiseActions[0](ref);
        }
      }
    },
    id,
    type,
    task: handler,
    resolve(result) {
      ref.status.resolving = true;
      // $FlowIgnore
      return ref[EXECUTE_RESULT](undefined, result);
    },
    reject(err) {
      ref.status.resolving = true;
      // $FlowIgnore
      return ref[EXECUTE_RESULT](err);
    },
    cancel() {
      if (!ref.status.complete && !ref.status.resolving) {
        if (ref.status.error === false) {
          lastResult = TASK_CANCELLED;
          ref.status.cancelled = true;
        }
        handler.cancel(id);
      }
    },
  };

  if (jobDescriptor) {
    const [getJob, args, refs] = jobDescriptor;
    job = getJob.apply(ref, args);
    ref.promise().catch(NOOP);
    // in the case of async jobs we need to set the refs
    // before we run the start call synchronously so that
    // we can handle any actions called during execution.
    refs.set(id, [ref, NOOP]);
    job.start.call(ref, ref);
  }

  return Object.freeze(ref);
}

export default function createTaskHandler(): Task$Handler {
  const refs: Task$RefMap = new Map();
  let queue;

  function getQueue() {
    if (queue) {
      return queue;
    }
    queue = createDeferQueue(refs);
    return queue;
  }

  function clearRef(id, withRef) {
    const descriptor = refs.get(id);
    if (!descriptor) {
      return;
    }
    const [ref, canceller] = descriptor;
    if (!withRef || withRef === ref) {
      canceller();
      refs.delete(id);
    }
    return ref;
  }

  function cancelID(id: any, promises: Array<any>): void {
    // Required for Flow to resolve
    const ref = clearRef(id);
    if (ref) {
      // $FlowIgnore
      ref[TASK_CANCELLED](promises);
    }
  }

  function execute<R: Task$Ref, +A: Array<any>, +F:(...args: A) => any>(
    ref: R,
    fn: void | F,
    args: A) {
    try {
      if (ref.type !== 'every') {
        ref.status.resolving = true;
        clearRef(ref.id, ref);
      }

      const result = typeof fn === 'function' ? fn.apply(ref, args) : undefined;
      // $FlowIgnore
      ref[EXECUTE_RESULT](undefined, result);
    } catch (e) {
      // $FlowIgnore
      ref[EXECUTE_RESULT](e);
    }
  }

  const handler: Task$Handler = Object.freeze({
    get size(): number {
      return refs.size;
    },
    has(...ids: Array<any>) {
      return ids.every(id => refs.has(id));
    },
    after<+ID: any, +A: Array<any>, +F: (...args: A) => any>(
      id: ID,
      delay: number,
      fn?: F,
      ...args: A
    ): Task$Ref {
      const ref = createTaskRef('after', id, handler);
      const timeoutID = setTimeout(execute, delay, ref, fn, args);
      refs.set(id, [ref, () => clearTimeout(timeoutID)]);
      return ref;
    },
    defer<+ID: any, +A: Array<any>, +F: (...args: A) => any>(
      id: ID,
      fn?: F,
      ...args: A
    ): Task$Ref {
      const ref = createTaskRef('defer', id, handler);
      const cancelDefer = getQueue().add(ref, () => execute(ref, fn, args));
      refs.set(id, [ref, () => cancelDefer()]);
      return ref;
    },
    every<+ID: any, +A: Array<any>, +F: (...args: A) => any>(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref {
      const ref = createTaskRef('every', id, handler);
      const timerID = setInterval(execute, interval, ref, fn, args);
      refs.set(id, [ref, () => clearInterval(timerID)]);
      return ref;
    },
    everyNow<+ID: any, +A: Array<any>, F: (...args: A) => any>(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref {
      const ref = createTaskRef('every', id, handler);
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
    job<+ID: any, +A: Array<any>, F: (...args: A) => Task$Job>(
      id: ID,
      getJob: F,
      ...args: A
    ): Task$Ref {
      const ref = createTaskRef('job', id, handler, [
        getJob,
        args || STATIC_EMPTY_ARRAY,
        refs,
      ]);
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
