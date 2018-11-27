import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[job] | task.job works as expected', () => {
  it('executes task.job().start synchronously', async () => {
    const task = createTaskHandler();
    let executed = false;
    task.job('job', () => ({
      start() {
        executed = true;
      },
      cancelled() {},
    }));
    expect(executed).to.be.equal(true);
    task.clear();
  });

  it('executes task.job().cancelled synchronously', async () => {
    const task = createTaskHandler();
    let executed = false;
    task.job('job', () => ({
      start() {},
      cancelled() {
        executed = true;
      },
    }));
    task.clear();
    expect(executed).to.be.equal(true);
  });
});
