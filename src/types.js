/* @flow */

export type Task$Types = 'after' | 'every' | 'defer' | 'job';

type Task$PromiseOption = {
  promise(): Promise<Array<any>>,
};

export type Task$Handler = {|
  get size(): number,
  has(...ids: Array<any>): boolean,
  after<ID: any, A: Array<any>, F: (...args: A) => any>(
    id: ID,
    delay: number,
    fn?: F,
    ...args: A
  ): Task$Ref,
  defer<ID: any, A: Array<any>, F: (...args: A) => any>(
    id: ID,
    fn?: F,
    ...args: A
  ): Task$Ref,
  every<ID: any, A: Array<any>, F: (...args: A) => any>(
    id: ID,
    interval: number,
    fn?: F,
    ...args: A
  ): Task$Ref,
  everyNow<ID: any, A: Array<any>, F: (...args: A) => any>(
    id: ID,
    interval: number,
    fn?: F,
    ...args: A
  ): Task$Ref,
  job<ID: any, A: Array<any>, F: (...args: A) => Task$Job>(
    id: ID,
    getJob: F,
    ...args: A
  ): Task$Ref,
  cancel(...ids: Array<any>): Task$PromiseOption,
  clear(): Task$PromiseOption,
|};

type Task$Promise$Every = AsyncGenerator<Task$Ref, Task$Ref, Task$Ref>;
type Task$Promise$Regular = Promise<Task$Ref>;

export type Task$RefMap = Map<any, [Task$Ref, () => void]>;

export type Task$Ref = {|
  +id: any,
  +type: Task$Types,
  get result(): any,
  get promise(): () => Task$Promise$Regular,
  get promises(): () => Task$Promise$Every,
  +status: {
    resolving: boolean,
    complete: boolean,
    cancelled: boolean,
    error: boolean,
  },
  cancel(): void,
  resolve(value: any): void,
  reject(reason: any): void,
  task: Task$Handler,
|};

export type Task$Job =
  | {|
      start(ref: Task$Ref): any,
      cancelled?: void,
    |}
  | {|
      start(ref: Task$Ref): any,
      cancelled(ref: Task$Ref): any,
    |};
