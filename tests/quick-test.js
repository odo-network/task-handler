/* @flow */
import createTaskHandler from '../src';

const task = createTaskHandler();

const timeoutPromise = delay => new Promise(resolve => setTimeout(resolve, delay));

task
  .after('id', 'hi')
  .promise()
  .then(ref => {
    if (ref.status.cancelled) {
      console.log('Cancelled!');
      return;
    }
    console.log('After! ', ref.result);
  });
