declare module 'task-handler' {
  export type Task$Types = 'after' | 'every' | 'defer' | 'job';

  type CANCELLED = symbol;

  // type TASK_CANCELLED = symbol;

  type Task$Promise$Every<R> = AsyncIterable<R>;

  type Task$Promise$Regular<R> = Promise<R>;

  interface Task$Ref$Shared<
    T extends Task$Types,
    ID,
    R,
    H extends Task$Handler
  > {
    id: ID;
    type: T;
    task: H;

    readonly promise: Task$Promise$Regular<Task$Ref$Complete<T, ID, R, H>>;
    readonly promises: Task$Promise$Every<Task$Ref$Complete<T, ID, R, H>>;

    cancel(): undefined;
    resolve(value: any): R;
    reject(reason: Error): R;
  }

  export interface Task$Ref$Running<
    T extends Task$Types,
    ID,
    R,
    H extends Task$Handler
  > extends Task$Ref$Shared<T, ID, R, H> {
    readonly result: undefined;
    readonly status: {
      readonly resolving: boolean;
      readonly complete: false;
      readonly cancelled: false;
      readonly error: false;
    };
  }

  export interface Task$Ref$Complete<
    T extends Task$Types,
    ID,
    R,
    H extends Task$Handler
  > extends Task$Ref$Shared<T, ID, R, H> {
    readonly result: R;
    readonly status: {
      readonly resolving: false;
      readonly complete: true;
      readonly cancelled: false;
      readonly error: false;
    };
  }

  export interface Task$Ref$Cancelled<
    T extends Task$Types,
    ID,
    R,
    H extends Task$Handler
  > extends Task$Ref$Shared<T, ID, R, H> {
    readonly result: CANCELLED;
    readonly status: {
      readonly resolving: false;
      readonly complete: true;
      readonly cancelled: true;
      readonly error: false;
    };
  }

  export type Task$Ref<T extends Task$Types, ID, R, H extends Task$Handler> =
    | Task$Ref$Running<T, ID, R, H>
    | Task$Ref$Complete<T, ID, R, H>
    | Task$Ref$Cancelled<T, ID, R, H>;

  export interface Task$Job<REF extends Task$Ref<any, any, any, any>> {
    start: (ref: REF) => void;
    error?: (error: Error) => void;
    cancelled?: (ref: REF) => void;
    complete?: (ref: REF) => void;
  }

  interface Task$PromiseOption<T> {
    promise(): Promise<T>;
  }

  export interface Task$Handler {
    readonly size: number;
    has(...ids: any[]): boolean;
    after<ID, A extends any[], F extends (...args: A) => void, R>(
      id: ID,
      delay: number,
      fn?: F,
      ...args: A
    ): Task$Ref<'after', ID, R, this>;
    defer<ID, R, A extends any[], F extends (...args: A) => void>(
      id: ID,
      fn?: F,
      ...args: A
    ): Task$Ref<'defer', ID, R, this>;
    every<
      ID extends any,
      A extends any[],
      F extends (...args: A) => void,
      R extends any
    >(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref<'every', ID, R, this>;
    everyNow<
      ID extends any,
      A extends any[],
      F extends (...args: A) => void,
      R extends any
    >(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref<'every', ID, R, this>;
    everySequential<
      ID extends any,
      A extends any[],
      F extends (...args: A) => void,
      R extends any
    >(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref<'every', ID, R, this>;
    everyNowSequential<
      ID extends any,
      A extends any[],
      F extends (...args: A) => void,
      R extends any
    >(
      id: ID,
      interval: number,
      fn?: F,
      ...args: A
    ): Task$Ref<'every', ID, R, this>;
    job<
      ID extends any,
      R extends any,
      A extends any[],
      REF extends Task$Ref<'job', ID, any, this>,
      F extends (ref: REF, ...args: A) => Task$Job<REF>
    >(
      id: ID,
      getJob: F,
      ...args: A
    ): REF;
    cancel(...ids: any[]): Task$PromiseOption<undefined>;
    clear(): Task$PromiseOption<undefined>;
  }

  export interface Task$Error<REF extends Task$Ref<any, any, any, any>>
    extends Error {
    taskRef: REF;
  }

  export const TASK_CANCELLED: CANCELLED;

  export default function createTaskHandler(): Task$Handler;
}
