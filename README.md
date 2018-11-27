# task-handler

A simple, dependency-free task scheduling manager that makes it easy to handle tasks like a boss.

Combined with [pubchan](https://www.github.com/Dash-OS/pubchan), provides a
lightweight and powerful toolkit for managing asynchronous coordination of your
application's events.

> **Note:** Documentation is currently a work in progress. However, the code
> itself is at a stable level and used in production. This module has been
> lifted from our private repositories and released to the public.

## Install

```
yarn add task-handler
```

**or**

```
npm install --save task-handler
```

## Flow Coverage

This project provides `.flow.js` files for `Flow` to utilize.

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
task.defer("task:four", () => log("task:four execute"));

// every interval and immediately (defer), execute
task.everyNow("task:three", 3000, () => log("task:three execute"));

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
async function every() {
  for await (const ref of task.every("everyID", 1000).promise()) {
    console.log("Next Tick");
    // based on some logic...
    ref.cancel();
  }
  console.log("After Cancel everyID");
}

// Or using standard async function...
async function intervalYielded() {
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
