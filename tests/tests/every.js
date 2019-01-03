import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[every] | task.every works as expected', () => {
  it('executes at given interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.every('[every] executes at given interval', 10, () => {
      i += 1;
    });
    await ms(50);
    // every starts AFTER first tick unless everyNow is used
    // so 4 is expected.
    task.clear();
    expect(i).to.be.equal(4);
  });

  it('allows cancellation of every tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.every('[every]', 10, () => {
      i += 1;
    });
    task.cancel('[every]');
    expect(i).to.be.equal(0);
    await ms(100);
    expect(i).to.be.equal(0);
  });

  it('allows using async iteration resolution', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();

    for await (const ref of task
      .every('[every] allows using async iteration resolution', 10)
      .promises()) {
      if (Date.now() - start > 50) {
        ref.cancel();
      } else {
        i += 1;
      }
    }
    task.clear();
    expect(i).to.be.equal(4);
  });
});

describe('[everyNow] | task.everyNow works as expected', () => {
  it('executes at given interval AND immediately (deferred)', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNow(
      '[everyNow] executes at given interval AND immediately (deferred)',
      10,
      () => {
        i += 1;
      },
    );
    await ms(50);
    task.clear();
    expect(i).to.be.equal(5);
  });

  it('allows cancellation of everyNow tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNow('[everyNow]', 10, () => {
      i += 1;
    });
    task.cancel('[everyNow]');
    expect(i).to.be.equal(0);
    await ms(100);
    expect(i).to.be.equal(0);
  });

  it('allows using async iteration resolution', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();
    for await (const ref of task
      .everyNow('[everyNow] allows using async iteration resolution', 10)
      .promises()) {
      if (Date.now() - start >= 50) {
        ref.cancel();
      } else {
        i += 1;
      }
    }
    task.clear();
    expect(i).to.be.closeTo(5, 1);
  });

  it('handles errors in async iteration properly', async () => {
    const task = createTaskHandler();
    let i = 0;
    const start = Date.now();
    const ref = task.everyNow(
      '[everyNow] handles errors in async iteration properly',
      10,
      () => {
        if (Date.now() - start >= 50) {
          throw new Error('error');
        } else {
          i += 1;
        }
      },
    );
    try {
      // eslint-disable-next-line no-unused-vars
      for await (const ref2 of ref.promises()) {
        // tick!
      }
    } catch (e) {
      // do nothing!
    }
    task.clear();
    expect(ref.status.error).to.be.equal(true);
    expect(ref.result.message).to.be.equal('error');
    expect(i).to.be.closeTo(5, 1);
  });

  it('allows calling ref.promise() to capture the next invocation result', async () => {
    const task = createTaskHandler();
    let i = 0;

    const ref = task.everyNow(
      '[everyNow]  allows calling ref.promise() to capture the next invocation result',
      10,
      () => {
        i += 1;
        return i;
      },
    );

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

    const iterator = task
      .everyNow('[everyNow] allows for multiple async iterators', 10)
      .promises();
    await Promise.all([instance(1), instance(2)]);
    console.log(i, 'TODO!');
  });
});

describe('[everySequential] | task.everySequential works as expected', () => {
  it('executes at given interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everySequential(
      '[everySequential] executes at given interval',
      10,
      () => {
        i += 1;
      },
    );
    await ms(50);
    // every starts AFTER first tick unless everyNow is used
    // so 4 is expected.
    task.clear();
    expect(i).to.be.equal(4);
  });

  it('executes sequentially at interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everySequential(
      '[everySequential] executes sequentially at interval',
      10,
      async () => {
        i += 1;
        await new Promise(resolve => setTimeout(resolve, 20));
      },
    );
    await ms(60);
    /*
      As we need to account for loop delays from node / computer:

      Runs after 10ms - sets to 1 - 10ms
      Waits 20ms - 30 ms
      Runs after 10ms - sets to 2 - 40ms
      Waits 20 ms - 60 ms
      Runs after 10ms - resolve during this
      Expects 2
    */
    task.clear();
    expect(i).to.be.equal(2);
  });
});

describe('[everyNowSequential] | task.everyNowSequential works as expected', () => {
  it('executes at given interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNowSequential(
      '[everyNowSequential] executes at given interval',
      100,
      () => {
        i += 1;
      },
    );
    await ms(250);
    // every starts AFTER first tick unless everyNow is used
    // so 4 is expected.
    task.clear();
    expect(i).to.be.equal(3);
  });

  it('executes sequentially at interval', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.everyNowSequential(
      '[everyNowSequential] executes sequentially at interval',
      10,
      async () => {
        i += 1;
        await new Promise(resolve => setTimeout(resolve, 30));
      },
    );
    await ms(70);
    /*
      As we need to account for loop delays from node / computer:

      Runs Immediately - sets to 1 - 0 (to 10 ms)
      Waits 30 ms for fn to resolve (30 ms)
      Waits 30 ms to execute - sets to 2 - (60 ms)
      Expects 2
    */
    task.clear();
    expect(i).to.be.equal(2);
  });
});
