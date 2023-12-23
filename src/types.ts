import {
  AnyActorRef,
  AnyEventObject,
  InspectionEvent,
  Observer,
  Snapshot,
} from 'xstate';

export interface StatelyBaseInspectionEvent {
  // the session ID of the root
  rootId: string | undefined;
  sessionId: string;
  createdAt: string; // Timestamp
  id: string; // unique string for this actor update
  _version: string; // version of this protocol
}

export type StatelySnapshotEvent = Pick<
  InspectionEvent & { type: '@xstate.snapshot' },
  'event' | 'rootId' | 'snapshot' | 'type'
> &
  StatelyBaseInspectionEvent;

export type StatelyEventEvent = Pick<
  InspectionEvent & { type: '@xstate.event' },
  'event' | 'rootId' | 'type'
> & {
  // used instead of sourceRef
  sourceId: string | undefined;
} & StatelyBaseInspectionEvent;

export type StatelyActorEvent = Pick<
  InspectionEvent & { type: '@xstate.actor' },
  'type'
> & {
  name: string;
  snapshot: InspectedSnapshot; // JSON snapshot
  definition: string | undefined; // JSON-stringified definition or URL
  parentId: string | undefined;
} & StatelyBaseInspectionEvent;

export type StatelyInspectionEvent =
  | StatelySnapshotEvent
  | StatelyEventEvent
  | StatelyActorEvent;

export interface Adapter {
  start?: () => void;
  stop?: () => void;
  send(event: StatelyInspectionEvent): void;
}

export interface InspectedSnapshot {
  status?: Snapshot<unknown>['status'];
  context?: any;
  value?: any;
  output?: any;
}

export interface Inspector<TAdapter extends Adapter> {
  adapter: TAdapter;
  /**
   * Sends a snapshot inspection event. This represents the state of the actor.
   */
  snapshot(
    actor: AnyActorRef | string,
    snapshot: InspectedSnapshot,
    info?: { event?: AnyEventObject }
  ): void;
  /**
   * Sends an event inspection event. This represents the event that was sent to the actor.
   */
  event(
    actor: AnyActorRef | string,
    event: AnyEventObject | string,
    info?: { source?: AnyActorRef | string }
  ): void;
  /**
   * Sends an actor registration inspection event. This represents the actor that was created.
   */
  actor(
    actor: AnyActorRef | string,
    snapshot?: InspectedSnapshot,
    info?: {
      definition?: string;
      parentId?: string;
      rootId?: string;
    }
  ): void;
  /**
   * Starts the inspector.
   */
  start: () => void;
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
   * ```
   */
  inspect: Observer<InspectionEvent>;
}
