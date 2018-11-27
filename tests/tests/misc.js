import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';

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
});
