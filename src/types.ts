import { AnyActorRef, AnyEventObject, InspectionEvent } from 'xstate';

export interface BaseInspectionEvent {
  // the session ID of the root
  rootId: string | undefined;
  sessionId: string;
  createdAt: string; // Timestamp
  id: string; // unique string for this actor update
  _version: string; // version of this protocol
}

export type ActorSnapshotEvent = Pick<
  InspectionEvent & { type: '@xstate.snapshot' },
  'event' | 'rootId' | 'snapshot' | 'type'
> &
  BaseInspectionEvent;

export type ActorEventEvent = Pick<
  InspectionEvent & { type: '@xstate.event' },
  'event' | 'rootId' | 'type'
> & {
  // used instead of sourceRef
  sourceId: string | undefined;
} & BaseInspectionEvent;

export type ActorActorEvent = Pick<
  InspectionEvent & { type: '@xstate.actor' },
  'type'
> & {
  definition: string | undefined; // JSON-stringified definition or URL
  parentId: string | undefined;
} & BaseInspectionEvent;

export interface ActorCommunicationEvent {
  type: '@xstate.event';
  event: AnyEventObject; // { type: string, ... }
  sourceId: string | undefined; // Session ID
  targetId: string; // Session ID, required
}

export interface ActorRegistrationEvent {
  type: '@xstate.actor';
  actorRef: AnyActorRef;
  sessionId: string;
  parentId?: string;
  definition?: string; // JSON-stringified definition or URL
}

export type ActorEvents =
  | ActorSnapshotEvent
  | ActorEventEvent
  | ActorActorEvent;

export interface Adapter {
  start?: () => void;
  stop?: () => void;
  send(event: ActorEvents): void;
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
    info?: { definition?: string; parentId?: string; rootId?: string }
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
