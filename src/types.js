/* @flow */

export type Task$Instance = {|
  after<+ID: string, +D: number, +R: *>(
    id: ID,
    delay: D,
    fn: () => R,
    ...args: Array<any>
  ): CallbackRef,
|};
