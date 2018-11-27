/* @flow */
import createTaskHandler from './src';

const task = createTaskHandler();

const timeoutPromise = delay => new Promise(resolve => setTimeout(resolve, delay));

// task
//   .after('id', 2000)
//   .promise()
//   .then(ref => {
//     if (ref.status.cancelled) {
//       console.log('Cancelled!');
//       return;
//     }
//     console.log('After! ', ref.result);
//   });

task
  .after('task2', 3000, () => 1)
  .promise()
  .then(async ref => {
    console.log('task2 then');
    if (ref.status.cancelled) {
      console.log('task2 cancelled!');
      await timeoutPromise(2000);
      console.log('Completing task2 cancellation handler');
      return;
    }
    await timeoutPromise(1000);
    console.log('After 2!', ref.result);
  })
  .then(() => {
    console.log('FINAL');
  });

const job = task.job('myJob', function executeJob() {
  console.log('myJob Created: ');
  const ref = this;
  let timerID;
  return {
    async start() {
      console.log('Start myJob ');
      timerID = setTimeout(() => ref.resolve(2), 2000);
    },
    async cancelled() {
      clearTimeout(timerID);
      console.log('myJob Cancelled');
      await timeoutPromise(1000);
      console.log('Completion of Cancel');
    },
  };
});

job.promise().then(ref => {
  console.log('Job Result: ', ref.result);
});

setTimeout(() => {
  task
    .clear()
    .promise()
    .then(() => {
      console.log('Clear Completed');
    });
}, 1000);

// console.log('Start');
// task.defer('later', () => console.log('Deferred'));
// task.defer('later', () => console.log('Deferred 2'));
// console.log('Next');

// async function intervalPromised() {
//   let i = 0;
//   console.log('Start Every');
//   for await (const ref of task
//     .every('int', 1000, () => {
//       i += 1;
//       console.log('Every Execute!');
//       return i;
//     })
//     .promise()) {
//     console.log('Tick ', ref.result);
//     if (ref.result === 5) {
//       console.log('Cancel Ref');
//       ref.cancel();
//     }
//   }
//   console.log('Interval Completed at: ', i);
// }

// setTimeout(() => intervalPromised());

// import './src/CancelPromise';
