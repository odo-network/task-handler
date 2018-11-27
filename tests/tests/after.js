import { expect } from 'chai';
import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[after] | task.after works as expected', () => {
  it('defers execution for given ms', async () => {
    const task = createTaskHandler();
    const start = Date.now();
    let end;
    task.after('after', 100, () => {
      end = Date.now();
    });
    await ms(150);
    expect(end - start).to.be.closeTo(100, 10);
  });

  it('allows cancellation of after tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.after('after', 0, () => {
      i = 1;
    });
    expect(i).to.be.equal(0);
    task.cancel('after');
    await ms(10);
    expect(i).to.be.equal(0);
  });

  it('resolves to "undefined" if the task is not complete', async () => {
    const task = createTaskHandler();
    const ref = task.after('after', 0, () => 'complete');
    expect(ref.result).to.be.equal(undefined);
    await ms(0);
    expect(ref.result).to.be.equal('complete');
  });

  it('resolves immediately if calling .promise() after a ref has resolved', async () => {
    const task = createTaskHandler();
    const ref = task.after('after', 0, () => 'complete');
    await ms(0);

    await ref.promise().then(() => {
      expect(ref.result).to.be.equal('complete');
    });
  });

  it('resolves after(0) AFTER any task.defer executions', async () => {
    const task = createTaskHandler();
    const resolved = {
      defer: undefined,
      after: undefined,
    };
    task.after('after', 0, () => {
      resolved.after = performance.now();
    });
    task.defer('defer', () => {
      resolved.defer = performance.now();
    });
    await ms(1);
    expect(resolved.after).to.be.above(resolved.defer);
  });
});
