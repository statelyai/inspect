import {
  StatelyActorEvent,
  StatelyEventEvent,
  StatelyInspectionEvent,
  StatelySnapshotEvent,
  Adapter,
} from './types';
import { toEventObject } from './utils';
import { Inspector } from './types';
import { Actor, AnyActorRef, InspectionEvent, StateMachine } from 'xstate';

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

export interface InspectorOptions {
  filter?: (event: StatelyInspectionEvent) => boolean;
}

export const defaultInspectorOptions: Required<InspectorOptions> = {
  filter: () => true,
};

export function createInspector(adapter: Adapter): Inspector {
  adapter.start?.();

  const inspector: Inspector = {
    actor: (actorRef, snapshot, info) => {
      const sessionId =
        typeof actorRef === 'string' ? actorRef : actorRef.sessionId;
      const definitionObject = (actorRef as any)?.logic?.config;
      const definition = definitionObject
        ? JSON.stringify(definitionObject)
        : undefined;

      adapter.send({
        type: '@xstate.actor',
        sessionId,
        createdAt: Date.now().toString(),
        _version: '0.0.1',
        rootId: info?.rootId,
        parentId: info?.parentId,
        id: null as any,
        definition,
        snapshot,
      } satisfies StatelyActorEvent);
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
    inspect: {
      next: (event) => {
        const convertedEvent = convertXStateEvent(event);
        adapter.send(convertedEvent);
      },
    },
    stop() {
      adapter.stop?.();
    },
  };

  return inspector;
}

export function convertXStateEvent(
  inspectionEvent: InspectionEvent
): StatelyInspectionEvent {
  switch (inspectionEvent.type) {
    case '@xstate.actor': {
      const actorRef = inspectionEvent.actorRef;
      const definitionObject = (actorRef as any)?.logic?.config;
      const definitionString = definitionObject
        ? JSON.stringify(definitionObject, (key, value) => {
            if (typeof value === 'function') {
              return { type: value.name };
            }

            return value;
          })
        : undefined;

      return {
        type: '@xstate.actor',
        definition: definitionString,
        _version: '0.0.1',
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
        parentId: inspectionEvent.actorRef._parent?.sessionId,
        sessionId: inspectionEvent.actorRef.sessionId,
        snapshot: inspectionEvent.actorRef.getSnapshot(),
      } satisfies StatelyActorEvent;
    }
    case '@xstate.event': {
      return {
        type: '@xstate.event',
        event: inspectionEvent.event,
        sourceId: inspectionEvent.sourceRef?.sessionId,
        // sessionId: inspectionEvent.targetRef.sessionId,
        sessionId: inspectionEvent.actorRef.sessionId,
        _version: '0.0.1',
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
      } satisfies StatelyEventEvent;
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
      } satisfies StatelySnapshotEvent;
    }
    default: {
      throw new Error(
        `Invalid inspection event type: ${(inspectionEvent as any).type}`
      );
    }
  }
}
