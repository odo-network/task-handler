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
    for await (const ref of task.every('every', 10).promise()) {
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
    for await (const ref of task.everyNow('every', 10).promise()) {
      if (Date.now() - start > 50) {
        ref.cancel();
      } else {
        i += 1;
      }
    }
    expect(i).to.be.equal(5);
    task.clear();
  });
});
