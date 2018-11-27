/* @flow */

export type Task$Types = 'after' | 'every' | 'defer' | 'job';

export type Task$Handler = {
  [key: string]: any,
};

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
    complete: boolean,
    cancelled: boolean,
    error: boolean,
  },
  cancel(): void,
  resolve(value: any): void,
  reject(reason: any): void,
  task: Task$Handler,
|};
