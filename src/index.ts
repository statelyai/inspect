import type { AnyActorRef, AnyEventObject, InspectionEvent } from 'xstate';

export function toEventObject(event: AnyEventObject | string): AnyEventObject {
  if (typeof event === 'string') {
    return { type: event };
  }

  return event;
}

export interface Inspector {
  /**
   * Sends a snapshot inspection event. This represents the state of the actor.
   */
  snapshot: (sessionId: string, snapshot: any) => void;
  /**
   * Sends an event inspection event. This represents the event that was sent to the actor.
   */
  event: (
    event: AnyEventObject | string,
    {
      source,
      target,
    }: {
      source?: string;
      target: string;
    }
  ) => void;
  /**
   * Sends an actor registration inspection event. This represents the actor that was created.
   */
  actor: (
    actorRef: AnyActorRef | string,
    { definition, parent }?: { definition?: string; parent?: string }
  ) => void;
  /**
   * Stops the inspector.
   */
  stop: () => void;
  /**
   * An inspection observer that can be passed into XState.
   * @example
   * ```js
   * import { createActor } from 'xstate';
   * import { createInspector } from '@xstate/inspect';
   * // ...
   *
   * const inspector = createInspector(...)
   *
   * const actor = createActor(someMachine, {
   *   inspect: inspector.inspect
   * })
   */
  inspect: (event: InspectionEvent) => void;
}

export { createWebSocketInspector } from './webSocketAdapter';
