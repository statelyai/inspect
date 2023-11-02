import {
  ActorActorEvent,
  ActorEventEvent,
  ActorEvents,
  ActorSnapshotEvent,
  Adapter,
} from './types';
import { toEventObject } from './utils';
import { Inspector } from './types';
import { AnyActorRef, InspectionEvent } from 'xstate';

function getRoot(actorRef: AnyActorRef) {
  let marker: AnyActorRef | undefined = actorRef;

  do {
    marker = marker._parent;
  } while (marker?._parent);

  return marker;
}

function getRootId(actorRefOrId: AnyActorRef | string): string | undefined {
  const rootActorRef =
    typeof actorRefOrId === 'string'
      ? undefined
      : getRoot(actorRefOrId)?.sessionId;

  return rootActorRef ?? undefined;
}

export function createInspector(adapter: Adapter): Inspector {
  adapter.start?.();

  const inspector: Inspector = {
    actor: (actorRef, info) => {
      const sessionId =
        typeof actorRef === 'string' ? actorRef : actorRef.sessionId;

      adapter.send({
        type: '@xstate.actor',
        sessionId,
        createdAt: Date.now().toString(),
        _version: '0.0.1',
        rootId: info?.rootId,
        parentId: info?.parentId,
        id: null as any,
        definition: undefined, // TODO
      } satisfies ActorActorEvent);
    },
    event(event, { source, target }) {
      adapter.send({
        type: '@xstate.event',
        sourceId: source,
        sessionId: target,
        event: toEventObject(event),
        id: Math.random().toString(),
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: '0.0.1',
      });
    },
    snapshot(sessionId, snapshot) {
      adapter.send({
        type: '@xstate.snapshot',
        snapshot,
        event: null as any,
        sessionId,
        id: null as any,
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: '0.0.1',
      });
    },
    inspect(event) {
      const convertedEvent = convertXStateEvent(event);
      adapter.send(convertedEvent);
    },
    stop() {
      adapter.stop?.();
    },
  };

  return inspector;
}
export function convertXStateEvent(
  inspectionEvent: InspectionEvent
): ActorEvents {
  switch (inspectionEvent.type) {
    case '@xstate.actor': {
      return {
        type: '@xstate.actor',
        definition: undefined, // TODO
        _version: '0.0.1',
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
        parentId: inspectionEvent.actorRef._parent?.sessionId,
        sessionId: inspectionEvent.actorRef.sessionId,
      } satisfies ActorActorEvent;
    }
    case '@xstate.event': {
      return {
        type: '@xstate.event',
        event: inspectionEvent.event,
        sourceId: inspectionEvent.sourceRef?.sessionId,
        sessionId: inspectionEvent.targetRef.sessionId,
        _version: '0.0.1',
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
      } satisfies ActorEventEvent;
    }
    case '@xstate.snapshot': {
      return {
        type: '@xstate.snapshot',
        event: inspectionEvent.event,
        snapshot: JSON.parse(JSON.stringify(inspectionEvent.snapshot)),
        sessionId: inspectionEvent.actorRef.sessionId,
        _version: '0.0.1',
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
      } satisfies ActorSnapshotEvent;
    }
    default: {
      throw new Error(
        `Invalid inspection event type: ${(inspectionEvent as any).type}`
      );
    }
  }
}
