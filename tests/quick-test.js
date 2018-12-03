/* @flow */
// const timeoutPromise = delay => new Promise(resolve => setTimeout(resolve, delay));
const ms = delay => new Promise(resolve => setTimeout(resolve, delay));
let i = 0;

const JOBS = new Map();

const TAKE = Symbol.for('@@saga/take');
const CANCEL = Symbol.for('@@saga/cancel');
const CALL = Symbol.for('@@saga/call');
const FORK = Symbol.for('@@saga/fork');
const ERROR = Symbol.for('@@saga/error');

function take(...types) {
  return [TAKE, ...types];
}

function call(fn, ...args) {
  return [CALL, fn, ...args];
}

function error(err) {
  return [ERROR, err];
}

function cancel(reason, ...args) {
  return [CANCEL, reason, ...args];
}

function fork(...args) {
  return [FORK, ...args];
}

const effects = {
  async [TAKE](args, job) {
    return new Promise(resolve => {
      const descriptor = {
        types: args,
        sets: new Set(),
        resolve,
      };
      job.context.queue.add(descriptor);
      args.forEach(type => {
        const set = job.controller.takes.get(type) || new Set();
        set.add(descriptor);
        descriptor.sets.add(set);
        job.controller.takes.set(type, set);
      });
    });
  },
  async [CALL](_args) {
    const [fn, ...args] = _args;
    return fn(...args);
  },
  async [ERROR]([err], job) {
    job.context.error = err;
    if (job.task.catch) {
      await job.task.catch(err);
    }
  },
  async [CANCEL](args, job) {
    job.context.cancelled = true;
    job.context.queue.forEach(descriptor => {
      console.log('Clearing Descriptor: ', descriptor);
      descriptor.sets.forEach(nestedSet => nestedSet.delete(descriptor));
    });
    job.context.queue.clear();
    if (job.task.cancelled) {
      await job.task.cancelled(...args);
      job.proc.return(CANCEL);
    }
  },
};

async function* taskRunner(job) {
  try {
    yield;
    let response;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { value, done } = await job.runner.next(response);
        if (done) break;
        response = yield value;
      } catch (e) {
        console.log('Catches: ', e);
        // $FlowIgnore
        if (!Array.isArray(e) || typeof e[0] !== 'symbol') {
          yield error(e);
        } else {
          switch (e[0]) {
            case CANCEL: {
              await effects[CANCEL](e.slice(1), job);
              break;
            }
            default: {
              yield e;
              break;
            }
          }
        }
        break;
      }
    }
  } finally {
    console.log('[runner]: Finally');
    job.context.complete = true;
    if (job.task.finally) {
      await job.task.finally();
    }
  }
  console.log('[runner]: proc done');
}

async function loopJob(job) {
  console.log('[loopJob]: Starts ');
  try {
    let response;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await job.proc.next(response);
      if (done) break;
      response = undefined;
      if (Array.isArray(value)) {
        const [type, ...args] = value;
        console.log('[loopJob]: Handle Type: ', type);
        if (effects[type]) {
          response = await effects[type](args, job);
          console.log('[loopJob]: Response ', response);
        } else {
          // $FlowIgnore
          response = await effects[ERROR](
            new Error(`Unknown Signal "${String(type)}"`),
            job,
          );
        }
      }
    }
  } finally {
    JOBS.delete(job);
    console.log('[loopJob]: Finishes ');
  }
}

function buildProcess(controller, startTask) {
  const task = startTask();
  const runner = task.run();

  const job = {
    controller,
    context: {
      cancelled: false,
      complete: false,
      error: undefined,
      queue: new Set(),
    },
    task,
    runner,
  };

  job.proc = taskRunner(job);
  loopJob(job);

  return job;
}

function saga(startTask) {
  console.log('[run]');

  const controller = {
    jobs: new Set(),
    takes: new Map(),
  };

  const job = buildProcess(controller, startTask);

  return Object.freeze({
    get complete() {
      return job.context.complete;
    },
    get cancelled() {
      return job.context.cancelled;
    },
    get error() {
      return job.context.error;
    },
    dispatch(type, ...args) {
      if (!job.context.complete) {
        const set = job.controller.takes.get(type);
        if (!set) return;
        set.forEach(descriptor => {
          job.context.queue.delete(descriptor);
          descriptor.sets.forEach(nestedSet => nestedSet.delete(descriptor));
          descriptor.resolve(args);
        });
        return true;
      }
      return false;
    },
    cancel(reason, ...args) {
      if (!job.context.complete && !job.context.cancelled) {
        job.proc.throw(cancel(reason, ...args));
        return true;
      }
      return false;
    },
  });
}

const sagaTask = saga(() => {
  console.log('[1] Run');
  return {
    * run() {
      while (true) {
        console.log('[1]: start take MY_TYPE');
        const value = yield take('MY_TYPE');
        console.log('[1]: MY_TYPE Response: ', value);
      }
    },
    cancelled(reason) {
      console.log('[1]: Cancelled because: ', reason);
    },
    catch(err) {
      console.log('[1]: Error Occurred: ', err);
    },
    finally() {
      console.log('[1]: Finally Called');
    },
  };
});

setInterval(() => {
  i += 1;
  // sagaTask.cancel('finished', 1, 2, 3);
  sagaTask.dispatch('MY_TYPE', 'hello!', i);
  if (i >= 3) {
    sagaTask.cancel('done');
  }
}, 5000);
