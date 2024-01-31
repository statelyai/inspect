import type { AnyEventObject, AnyActorRef, Observer } from 'xstate';

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

export function toObserver<T>(
  nextHandler?: Observer<T> | ((value: T) => void),
  errorHandler?: (error: any) => void,
  completionHandler?: () => void
): Observer<T> {
  const isObserver = typeof nextHandler === 'object';
  const self = isObserver ? nextHandler : undefined;

  return {
    next: (isObserver ? nextHandler.next : nextHandler)?.bind(self),
    error: (isObserver ? nextHandler.error : errorHandler)?.bind(self),
    complete: (isObserver ? nextHandler.complete : completionHandler)?.bind(
      self
    ),
  };
}
