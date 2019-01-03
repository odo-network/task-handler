// /* @flow */

import createTask from '../src';

const task = createTask();

async function test() {
  let i = 0;
  const start = Date.now();
  let last = start;
  const refOne = task.everySequential('every', 100, async () => {
    i += 1;
    let now = Date.now();
    console.log(now - start, now - last);
    last = now;
    const id = i;
    console.log('EVERY EXECUTES! ', id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    now = Date.now();
    console.log(now - start, now - last);
    last = now;
    console.log('EVERY COMPLETES ', id);

    if (i >= 2) {
      console.log('Cancelling!');
      refOne.cancel();
    }
  });
}

test();
