/* @flow */

export const NOOP = () => {};

export const STATIC_EMPTY_ARRAY = Object.freeze([]);

export const EXECUTE_RESULT = Symbol.for('@task-handler/result');

export const TASK_CANCELLED = Symbol.for('@task-handler/cancelled');
