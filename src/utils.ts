import type { AnyActorRef, AnyEventObject } from 'xstate';

export function toEventObject(event: AnyEventObject | string): AnyEventObject {
  if (typeof event === 'string') {
    return { type: event };
  }

  return event;
}

export function isActorRef(actorRef: any): actorRef is AnyActorRef {
  return (
    typeof actorRef === 'object' &&
    actorRef !== null &&
    typeof actorRef.sessionId === 'string' &&
    typeof actorRef.send === 'function'
  );
}

export const isNode =
  typeof process !== 'undefined' &&
  typeof process.versions?.node !== 'undefined' &&
  typeof document === 'undefined';
