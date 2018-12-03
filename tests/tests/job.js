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
    }));

    expect(executed).to.be.equal(true);
    task.clear();
  });

  it('handles task.job().start errors properly', async () => {
    const task = createTaskHandler();
    let errored = false;
    try {
      task.job('job', () => ({
        start() {
          throw new Error('error');
        },
        cancelled() {},
      }));
    } catch (e) {
      errored = true;
    }

    expect(errored).to.be.equal(true);
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

  it('allows awaiting cancellation promises for jobs', async () => {
    const task = createTaskHandler();
    let executed = false;
    task.job('job', () => ({
      start() {},
      async cancelled() {
        await ms(10);
        executed = true;
      },
    }));
    await task.clear().promise();
    expect(executed).to.be.equal(true);
  });

  it('properly handles ref.resolve(result)', async () => {
    const task = createTaskHandler();
    const topref = await task
      .job('job', () => ({
        start(ref) {
          ref.resolve('success');
        },
        cancelled() {},
      }))
      .promise();

    expect(topref.result).to.be.equal('success');

    task.clear();
  });

  it('properly handles ref.reject(err)', async () => {
    const task = createTaskHandler();
    let msg;
    try {
      const ref2 = await task
        .job('job', () => ({
          start(ref) {
            ref.reject('error');
          },
          cancelled() {},
        }))
        .promise();
    } catch (e) {
      msg = e.message;
    }

    expect(msg).to.be.equal('error');

    task.clear();
  });
});
