import type { AnyEventObject } from 'xstate';

export function toEventObject(event: AnyEventObject | string): AnyEventObject {
  if (typeof event === 'string') {
    return { type: event };
  }

  return event;
}

export const isNode =
  typeof process !== 'undefined' &&
  typeof process.versions?.node !== 'undefined' &&
  typeof document === 'undefined';
