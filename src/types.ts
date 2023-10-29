import { AnyActorRef, AnyEventObject, InspectionEvent } from 'xstate';

export interface BaseInspectionEvent {
  // the session ID of the root
  rootId: string;
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
  definition?: string; // JSON-stringified definition or URL
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
  start(): void;
  stop(): void;
  send(event: ActorEvents): void;
}
