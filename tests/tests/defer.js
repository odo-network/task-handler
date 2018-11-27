import { expect } from 'chai';
import createTaskHandler from '../../src';

const ms = delay => new Promise(resolve => setTimeout(resolve, delay));

describe('[defer] | task.defer works as expected', () => {
  it('defers execution to next frame', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.defer('deferred', () => {
      i = 1;
    });
    expect(i).to.be.equal(0);
    await ms(0);
    expect(i).to.be.equal(1);
  });

  it('allows cancellation of deferred tasks by ID', async () => {
    const task = createTaskHandler();
    let i = 0;
    task.defer('deferred', () => {
      i = 1;
    });
    expect(i).to.be.equal(0);
    task.cancel('deferred');
    await ms(0);
    expect(i).to.be.equal(0);
  });

  it('allows cancellation of deferred tasks by ref.cancel()', async () => {
    const task = createTaskHandler();
    let i = 0;
    const ref = task.defer('deferred', () => {
      i = 1;
    });
    expect(i).to.be.equal(0);
    ref.cancel();
    await ms(0);
    expect(i).to.be.equal(0);
  });

  it('allows cancellation of multiple defers with task.clear()', async () => {
    const task = createTaskHandler();
    const executed = {
      one: false,
      two: false,
    };
    task.defer('deferred-1', () => {
      executed.one = true;
    });
    task.defer('deferred-2', () => {
      executed.two = true;
    });
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
    task.clear();
    await ms(0);
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
  });

  it('allows cancellation of multiple defers with task.cancel(id1, id2, ...)', async () => {
    const task = createTaskHandler();
    const executed = {
      one: false,
      two: false,
    };
    task.defer('deferred-1', () => {
      executed.one = true;
    });
    task.defer('deferred-2', () => {
      executed.two = true;
    });
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
    task.cancel('deferred-1', 'deferred-2');
    await ms(0);
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
  });

  it('replaces multiple defers with same id', async () => {
    const task = createTaskHandler();
    const executed = {
      one: false,
      two: false,
    };
    const refOne = task.defer('deferred', () => {
      executed.one = true;
    });
    const refTwo = task.defer('deferred', () => {
      executed.two = true;
    });
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
    await ms(0);
    expect(refOne.status).to.be.deep.equal({
      complete: true,
      cancelled: true,
    });
    expect(refTwo.status).to.be.deep.equal({
      complete: true,
      cancelled: false,
    });
    expect(executed).to.be.deep.equal({
      one: false,
      two: true,
    });
  });

  it('allows multiple defers with different ids', async () => {
    const task = createTaskHandler();
    const executed = {
      one: false,
      two: false,
    };
    task.defer('deferred-1', () => {
      executed.one = true;
    });
    task.defer('deferred-2', () => {
      executed.two = true;
    });
    expect(executed).to.be.deep.equal({
      one: false,
      two: false,
    });
    await ms(0);
    expect(executed).to.be.deep.equal({
      one: true,
      two: true,
    });
  });

  it('properly sets the ref.status values for defer', async () => {
    const task = createTaskHandler();

    const refOne = task.defer('deferred-1', () => {});
    const refTwo = task.defer('deferred-2', () => {});

    expect(refOne.status).to.be.deep.equal({
      complete: false,
      cancelled: false,
    });
    expect(refTwo.status).to.be.deep.equal({
      complete: false,
      cancelled: false,
    });

    refTwo.cancel();

    expect(refTwo.status).to.be.deep.equal({
      complete: true,
      cancelled: true,
    });

    await ms(0);

    expect(refOne.status).to.be.deep.equal({
      complete: true,
      cancelled: false,
    });
  });

  it('allows retrieving the result of defer using promise', async () => {
    const task = createTaskHandler();
    const promise = task.defer('deferred-1', () => 'success').promise();
    expect(promise).to.be.a('promise');
    const ref = await promise;
    expect(ref.result).to.be.equal('success');
  });

  it('allows catching errors in promise .catch handler', async () => {
    const task = createTaskHandler();
    let msg = false;
    const promise = task
      .defer('deferred-1', () => {
        throw new Error('error');
      })
      .promise()
      .catch(err => {
        msg = err.message;
      });
    expect(promise).to.be.a('promise');
    await promise;
    expect(msg).to.be.equal('error');
  });
});
