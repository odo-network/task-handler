import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[every] | task.every works as expected', () => {
  it('executes at given interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.every('every', 10, () => {
      i += 1;
    });
    await ms(50);
    // every starts AFTER first tick unless everyNow is used
    // so 4 is expected.
    expect(i).to.be.equal(4);
    task.clear();
  });

  it('allows cancellation of every tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.every('every', 10, () => {
      i += 1;
    });
    expect(i).to.be.equal(0);
    task.cancel('every');
    await ms(100);
    expect(i).to.be.equal(0);
  });

  it('allows using async iteration resolution', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();
    for await (const ref of task.every('every', 10).promises()) {
      if (Date.now() - start > 50) {
        ref.cancel();
      } else {
        i += 1;
      }
    }
    expect(i).to.be.equal(4);
    task.clear();
  });
});

describe('[everyNow] | task.everyNow works as expected', () => {
  it('executes at given interval AND immediately (deferred)', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNow('every', 10, () => {
      i += 1;
    });
    await ms(50);
    expect(i).to.be.equal(5);
    task.clear();
  });

  it('allows cancellation of everyNow tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNow('every', 10, () => {
      i += 1;
    });
    expect(i).to.be.equal(0);
    task.cancel('every');
    await ms(100);
    expect(i).to.be.equal(0);
  });

  it('allows using async iteration resolution', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();
    for await (const ref of task.everyNow('every', 10).promises()) {
      if (Date.now() - start >= 50) {
        ref.cancel();
      } else {
        i += 1;
      }
    }
    expect(i).to.be.closeTo(5, 1);
    task.clear();
  });

  it('handles errors in async iteration properly', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();
    const ref = task.everyNow('every', 10, () => {
      if (Date.now() - start >= 50) {
        throw new Error('error');
      } else {
        i += 1;
      }
    });
    try {
      // eslint-disable-next-line no-unused-vars
      for await (const ref2 of ref.promises()) {
        // tick!
      }
    } catch (e) {
      // do nothing!
    }

    expect(ref.status.error).to.be.equal(true);
    expect(ref.result.message).to.be.equal('error');
    expect(i).to.be.closeTo(5, 1);
    task.clear();
  });

  it('allows calling ref.promise() to capture the next invocation result', async () => {
    const task = createTaskHandler();
    let i = 0;

    const ref = task.everyNow('every', 10, () => {
      i += 1;
      return i;
    });

    await ms(100);

    await ref.promise().then(() => {
      ref.cancel();
      expect(i).to.be.closeTo(11, 1);
    });

    task.clear();
  });

  it('allows for multiple async iterators', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();

    async function instance() {
      for await (const ref of iterator) {
        if (Date.now() - start >= 50) {
          ref.cancel();
        } else {
          i += 1;
        }
      }
    }

    const iterator = task.everyNow('every', 10).promises();
    await Promise.all([instance(1), instance(2)]);
    console.log('TODO!');
  });
});
