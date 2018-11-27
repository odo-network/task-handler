import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';
import { EXECUTE_RESULT } from '../../src/constants';

// const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[misc] | various functions & utilities work', () => {
  it('task.size gives current # of scheduled tasks', () => {
    const task = createTaskHandler();
    task.after('after', 100, () => {});
    task.defer('defer', () => {});
    task.everyNow('everyNow', 100, () => {});
    task.every('every', 100, () => {});
    task.job('job', () => ({
      start() {},
      cancelled() {},
    }));
    expect(task.size).to.be.equal(5);
    task.clear();
  });

  it('doesnt allow re-execution of a job that is complete', async () => {
    const task = createTaskHandler();
    const ref = task.after('after', 100, () => 1);
    await ref.promise();
    ref[EXECUTE_RESULT](undefined, 2);
    expect(ref.result).to.be.equal(1);
  });
});
