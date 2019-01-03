// /* @flow */

import createTask from '../src';

const task = createTask();

async function awaitResults(ref) {
  while (true) {
    try {
      for await (const result of ref.promises()) {
        console.log('Result! ', result);
      }
      return;
    } catch (e) {
      task.clear();
    }
  }
}

async function test() {
  let i = 0;
  const start = Date.now();
  let last = start;
  const refOne = task.everySequential('every', 1000, async () => {
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

    throw new Error('ERROR!!!');
  });

  awaitResults(refOne);
}

test();
