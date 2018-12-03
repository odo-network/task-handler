import { expect } from 'chai';
// import { performance } from 'perf_hooks';
import createTaskHandler from '../../src';
import { EXECUTE_RESULT } from '../../src/constants';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

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
    task.clear();
  });

  it('allows checking if a task exists using task.has(...ids)', async () => {
    const task = createTaskHandler();
    task.after('after', 100, () => 1);

    const shouldHave = task.has('after');
    const shouldntHave = task.has('after', 'somethingRandom');

    expect(shouldHave).to.be.equal(true);
    expect(shouldntHave).to.be.equal(false);

    task.clear();
  });

  it('removes refs from memory once executed if not an interval type', async () => {
    const task = createTaskHandler();

    task.after('after', 0, () => {
      hasID = task.has('after');
    });

    let hasID = task.has('after');

    expect(hasID).to.be.equal(true);
    await ms(1);
    expect(hasID).to.be.equal(false);
  });

  it('doesnt cancel a ref with same id that was already cancelled', async () => {
    const task = createTaskHandler();

    let refTwo;

    let executed = false;

    const refOne = task.after('after', 10, () => {
      refTwo = task.after('after', 10, () => {
        executed = true;
      });
      refOne.cancel();
    });

    await refOne.promise();
    await refTwo.promise();

    expect(executed).to.be.equal(true);

    task.clear();
  });

  // it('errors if calling .promise() from an every or everyNow task', async () => {
  //   const task = createTaskHandler();
  //   const ref = task.every('every', 100);
  //   let errored = false;
  //   try {
  //     await ref.promise();
  //   } catch (e) {
  //     errored = true;
  //   }
  //   expect(errored).to.be.equal(true);
  //   task.clear();
  // });

  it('errors if calling .promises() from an after or defer task', async () => {
    const task = createTaskHandler();
    const ref = task.after('after', 100);
    let errored = false;
    try {
      await ref.promises();
    } catch (e) {
      errored = true;
    }
    expect(errored).to.be.equal(true);
    task.clear();
  });
});
