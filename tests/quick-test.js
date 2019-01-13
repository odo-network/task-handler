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
  let ref;
  const rid = 'hi';
  const refOne = task.job(rid, () => ({
    start: _ref => {
      ref = _ref;
    },
    error(err) {
      console.log(err);
    },
  }));

  awaitResults(refOne);
}

test();
