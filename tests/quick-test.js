// /* @flow */

// import createTask from '../src';

// const task = createTask();

// async function test() {
//   let refTwo;
//   const refOne = task.after('after', 10, () => {
//     console.log('Ref One After');
//     refTwo = task.after('after', 10, () => {
//       console.log('Executed RefTwo');
//       executed = true;
//     });
//     refOne.cancel();
//   });

//   await refOne.promise();
//   await refTwo.promise();
// }

// test();
