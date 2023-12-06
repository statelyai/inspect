import {
  StatelyActorEvent,
  StatelyEventEvent,
  StatelyInspectionEvent,
  StatelySnapshotEvent,
  Adapter,
} from './types';
import { toEventObject } from './utils';
import { Inspector } from './types';
import { AnyActorRef, InspectionEvent, Snapshot } from 'xstate';
import pkg from '../package.json';

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
  serialize?: (event: StatelyInspectionEvent) => StatelyInspectionEvent;
}

export const defaultInspectorOptions: Required<InspectorOptions> = {
  filter: () => true,
  serialize: (event) => event,
};

export function createInspector<TAdapter extends Adapter>(
  adapter: TAdapter
): Inspector<TAdapter> {
  const inspector: Inspector<TAdapter> = {
    adapter,
    actor: (actorRef, snapshot, info) => {
      const sessionId =
        typeof actorRef === 'string' ? actorRef : actorRef.sessionId;
      const definitionObject = (actorRef as any)?.logic?.config;
      const definition = definitionObject
        ? JSON.stringify(definitionObject)
        : undefined;
      const rootId =
        info?.rootId ?? typeof actorRef === 'string'
          ? undefined
          : getRootId(actorRef);
      const parentId =
        info?.parentId ?? typeof actorRef === 'string'
          ? undefined
          : actorRef._parent?.sessionId;
      const name = definitionObject ? definitionObject.id : sessionId;

      adapter.send({
        type: '@xstate.actor',
        name,
        sessionId,
        createdAt: Date.now().toString(),
        _version: pkg.version,
        rootId,
        parentId,
        id: null as any,
        definition,
        snapshot: snapshot ?? { status: 'active' },
      } satisfies StatelyActorEvent);
    },
    event(target, event, extra) {
      const sessionId = typeof target === 'string' ? target : target.sessionId;
      adapter.send({
        type: '@xstate.event',
        sourceId: extra?.source,
        sessionId,
        event: toEventObject(event),
        id: Math.random().toString(),
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: pkg.version,
      });
    },
    snapshot(actor, snapshot, extra) {
      const sessionId = typeof actor === 'string' ? actor : actor.sessionId;
      adapter.send({
        type: '@xstate.snapshot',
        snapshot: snapshot as unknown as Snapshot<unknown>,
        event: extra?.event ?? (null as any),
        sessionId,
        id: null as any,
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: pkg.version,
      });
    },
    inspect: {
      next: (event) => {
        const convertedEvent = convertXStateEvent(event);
        adapter.send(convertedEvent);
      },
    },
    start() {
      adapter.start?.();
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
      const name = definitionObject ? definitionObject.id : actorRef.sessionId;

      return {
        name,
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
