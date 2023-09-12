import { AnyActorRef, AnyEventObject } from 'xstate';

export interface BaseInspectionEvent {
  // the session ID of the root
  actorSystemId: string;
  createdAt: string; // Timestamp
  id: string; // unique string for this actor update
  _version: string; // version of this protocol
}

export interface ActorTransitionEvent {
  type: '@xstate.snapshot';
  snapshot: any;
  event: AnyEventObject; // { type: string, ... }
  status: 0 | 1 | 2; // 0 = not started, 1 = started, 2 = stopped
  sessionId: string;
  sourceId?: string; // Session ID
}

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

export type InspectionEvent =
  | ActorTransitionEvent
  | ActorCommunicationEvent
  | ActorRegistrationEvent;

export type ResolvedInspectionEvent = InspectionEvent & BaseInspectionEvent;

export interface Adapter {
  start(): void;
  stop(): void;
  send(event: ResolvedInspectionEvent): void;
}
