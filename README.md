# task-handler

[![npm](https://img.shields.io/npm/v/task-handler.svg)](https://github.com/odo-network/task-handler)
[![Build Status](https://travis-ci.com/odo-network/task-handler.svg?branch=master)](https://travis-ci.com/odo-network/task-handler)
[![Known Vulnerabilities](https://snyk.io/test/github/odo-network/task-handler/badge.svg?targetFile=package.json)](https://snyk.io/test/github/odo-network/task-handler?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/odo-network/task-handler/badge.svg?branch=master&service=github)](https://coveralls.io/github/odo-network/task-handler?branch=master)
[![Flow Coverage](./dev/coverage/flow/flow-coverage-badge.svg)](https://odo-network.github.io/task-handler/dev/coverage/flow/index.html)
[![license](https://img.shields.io/github/license/odo-network/task-handler.svg)](https://github.com/odo-network/task-handler)

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

This project provides `.flow.js` files for `Flow` to utilize. It also attempts to provide near-100% test coverage.

## Example

### Simple

```js
/* @flow */

import createTaskHandler from "task-handler";

const task = createTaskHandler("simple");

// after timeout
const refOne = task.after("task:one", 3000, () => log("task:one execute"));

// every interval, execute
const refTwo = task.every("task:two", 3000, () => log("task:two execute"));

// immediately execute on next tick (nextTick, immediate, timeout priority - first found)
const refThree = task.defer("task:three", () => log("task:three execute"));

// every interval and immediately (defer), execute
const refFour = task.everyNow("task:four", 3000, () =>
  log("task:four execute")
);

// sequentially execute at an interval -
// waits until the function requested to
// finish before scheduling the next
// timeout.
// - NOTE: Awaits promises if returned
//         by the function. Which is not
//         the standard behavior.
const refFive = task.everySequential("task:five", 100, async () => {
  log("task:five execute");
  await new Promise(resolve => setTimeout(resolve, 3000));
  log("task:five completes");
});

// same as above but adds a deferred execution first
// which occurs on the next tick.
const refSix = task.everyNowSequential("task:six", 100, async () => {
  log("task:six execute");
  await new Promise(resolve => setTimeout(resolve, 3000));
  log("task:six completes");
});

// schedule an advanced async job with cancellation
const refSeven = task.job(
  "task:seven",
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
task.size; // 7

// cancels each of the given ID's, if they exist
task.cancel("task:one", "task:two");

// clear all tasks, killing the event queue and completing execution
task.after("complete", 10000, () => {
  log("complete - clearing tasks");
  task.clear();
});
```

### Features / Summaries

#### Auto Cancellation

Creating a task with the same `id` as another task will cancel the previous task and schedule the next automatically.

#### Refs

`task-handler` implements a concept of `task refs` so that we can provide a unified API across all of the event types.

When using `promises`, the promise will be resolved with the `ref` for the task which allows capturing the result via `ref.result`.

> If an error is caught, the error object will include the ref as a property.

```javascript
export type Task$Types = "after" | "every" | "defer" | "job";

export type Task$Ref = {|
  /* Task ID */
  +id: any,
  /* indicates the general type of the task */
  +type: Task$Types,
  /* the result of executing the tasks handler */
  get result(): any,
  /* returns a promise that resolves to the next result.
     if the task is an 'every' type, it must be called 
     after every execution to continually get the next 
     promise (or use ref.promises() instead). */
  get promise(): () => Task$Promise$Regular,
  /* async iterator that provides results for each iteration.  May only be called on 'every' type tasks. */
  get promises(): () => Task$Promise$Every,
  /* Status about the task */
  +status: {
    /* Task is resolving by calling its execute handler */
    resolving: boolean,
    /* Task has resolved and has completed execution */
    complete: boolean,
    /* Task was cancelled */
    cancelled: boolean,
    /* Task encountered an error */
    error: boolean
  },
  /* Cancels the task, an alias for `task.cancel(ref.id)` */
  cancel(): void,
  /* Resolves the task with the value provided. */
  resolve(value: any): void,
  /* Rejects the event and calls the error handling 
     that is present on the task (if any).  Generally 
     used for `task.job` but works with any active 
     task. */
  reject(reason: any): void,
  /* top-level task handler the ref belongs to */
  task: Task$Handler
|};
```

> For the complete types, view [types.js](./src/types.js).

#### Promises

When calling `.promise()` on the task ref, `after` and `defer` return regular promises that resolve to the task ref with a result of the function passed. If no function is passed then the `ref.result` will be undefined.

```js
task
  .after("afterID", 1000, () => 1)
  .promise()
  .then(ref => {
    console.log("After 1000ms: ", ref.result); // After 1000ms: 1
  });
```

Interval tasks such as `every` and `everyNow` return `async iterators` when their `.promises()` function is called. This allows us to utilize the handy `for await... of` feature of JS.

> **IMPORTANT:** Notice that `every`, `everySequential`, and their related siblings use `.promises()` and `.promise()`. If other functions call `.promises()` which are not interval types they will throw an error.

```js
async function intervalForAwait() {
  const ref = task.every("everyID", 1000);
  for await (const ref of ref.promises()) {
    console.log("Next Tick");
    // based on some logic...
    ref.cancel();
  }
  console.log("After Cancel everyID");
}

// Or using standard async function...
async function intervalAwait() {
  const iter = task.every("everyID", 1000).promises();
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

// if we want to handle errors that are not caught
// in the task runner we can utilize a while loop:
async function awaitResults(ref) {
  const ref = task.every(
    "everyID",
    1000,
    () => throw new Error("Error Message")
  );
  while (true) {
    try {
      for await (const result of ref.promises()) {
        console.log("Tick!");
      }
      return;
    } catch (e) {
      console.log("Error!", e);
    }
  }
}
```
