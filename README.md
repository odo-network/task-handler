# task-handler

[![npm](https://img.shields.io/npm/v/task-handler.svg)](https://github.com/odo-network/task-handler)
[![Build Status](https://travis-ci.com/odo-network/task-handler.svg?branch=master)](https://travis-ci.com/odo-network/task-handler)
[![Known Vulnerabilities](https://snyk.io/test/github/odo-network/task-handler/badge.svg?targetFile=package.json)](https://snyk.io/test/github/odo-network/task-handler?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/odo-network/task-handler/badge.svg?branch=master&service=github)](https://coveralls.io/github/odo-network/task-handler?branch=master)
[![Flow Coverage](./.flow/flow-coverage-badge.svg)](./.flow/index.html)
[![license](https://img.shields.io/github/license/odo-network/task-handler.svg)](https://github.com/odo-network/task-handler)
[![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/react.svg)](https://github.com/odo-network/task-handler)

A simple, dependency-free task scheduling manager that makes it easy to handle tasks like a boss.

## Install

```
yarn add task-handler
```

**or**

```
npm install --save task-handler
```

## Coverage

This project provides `.flow.js` files for `Flow` to utilize. It also attempts to provide 100% test coverage.

## Example

### Simple

```js
/* @flow */

import createTaskHandler from "task-handler";

const task = createTaskHandler("simple");

// after timeout
task.after("task:one", 3000, () => log("task:one execute"));

// every interval, execute
task.every("task:two", 3000, () => log("task:two execute"));

// immediately execute on next tick (nextTick, immediate, timeout priority - first found)
task.defer("task:three", () => log("task:three execute"));

// every interval and immediately (defer), execute
task.everyNow("task:four", 3000, () => log("task:four execute"));

// schedule an advanced async job with cancellation
task.job(
  "task:five",
  function TaskFiveHandler(...args) {
    // args resolves to [1, 2, 3]
    // saved context - `this` resolves to the job `ref`
    const ref = this;
    return {
      async start(ref2) {
        // called when the job starts (synchronously)
        //
        // ref is also the first argument given, it is the same as the
        // top level `this` but can be used when using arrow function
        // at the top level.
        // ref.resolve('value');
        // ref.reject('error');
        // ref.cancel();
      },
      async cancelled() {
        // called if the job is cancelled
      },
      async complete() {
        // called when the job is complete (resolved, cancelled, or errored).
      }
    };
  },
  [1, 2, 3]
);

// get the total # of tasks scheduled
task.size; // 5

// cancels each of the given ID's, if they exist
task.cancel("task:one", "task:two");

// clear all tasks, killing the event queue and completing execution
task.after("complete", 10000, () => {
  log("complete - clearing tasks");
  task.clear();
});
```

### Promises

When calling `.promise()` on the task ref, `after` and `defer` return regular promises that resolve to the task ref with a result of the function passed. If no function is passed then the `ref.result` will be undefined.

```js
task
  .after("afterID", 1000, () => 1)
  .promise()
  .then(ref => {
    console.log("After 1000ms: ", ref.result); // After 1000ms: 1
  });
```

Interval tasks such as `every` and `everyNow` return `async iterators` when their `.promise()` function is called. This allows us to utilize the handy `for await... of` feature of JS.

```js
async function intervalForAwait() {
  for await (const ref of task.every("everyID", 1000).promise()) {
    console.log("Next Tick");
    // based on some logic...
    ref.cancel();
  }
  console.log("After Cancel everyID");
}

// Or using standard async function...
async function intervalAwait() {
  const iter = task.every("everyID", 1000).promise();
  let done = false;
  let ref;
  while (!done) {
    let ref;
    ({ value: ref, done } = await iter.next());
    console.log("Next Tick");
    // based on some logic...
    ref.cancel();
  }
  console.log("After Cancel everyID");
}
```
