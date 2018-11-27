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
    const ref = await task
      .job('job', () => ({
        start(ref) {
          ref.resolve('success');
        },
        cancelled() {},
      }))
      .promise();

    expect(ref.result).to.be.equal('success');
  });

  it('properly handles ref.reject(err)', async () => {
    const task = createTaskHandler();
    let msg;
    try {
      await task
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
  });
});
