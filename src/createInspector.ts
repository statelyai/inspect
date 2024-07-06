import {
  StatelyActorEvent,
  StatelyEventEvent,
  StatelyInspectionEvent,
  StatelySnapshotEvent,
  Adapter,
} from './types';
import { toEventObject } from './utils';
import { Inspector } from './types';
import {
  AnyActorRef,
  AnyEventObject,
  InspectionEvent,
  MachineContext,
  Snapshot,
} from 'xstate';
import pkg from '../package.json';
import { idleCallback } from './idleCallback';
import safeStringify from 'safe-stable-stringify';

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
  /**
   * Whether to automatically start the inspector.
   *
   * @default true
   */
  autoStart?: boolean;
  /**
   * The maximum number of deferred events to hold in memory until the inspector is active.
   * If the number of deferred events exceeds this number, the oldest events will be dropped.
   *
   * @default 200
   */
  maxDeferredEvents?: number;

  /**
   * Sanitizes events sent to actors. Only the sanitized event will be sent to the inspector.
   */
  sanitizeEvent?: (event: AnyEventObject) => AnyEventObject;

  /**
   * Sanitizes actor snapshot context. Only the sanitized context will be sent to the inspector.
   */
  sanitizeContext?: (context: MachineContext) => MachineContext;
}

export const defaultInspectorOptions: Required<InspectorOptions> = {
  filter: () => true,
  serialize: (event) => event,
  autoStart: true,
  maxDeferredEvents: 200,
  sanitizeEvent: (event) => event,
  sanitizeContext: (context) => context,
};

export function createInspector<TAdapter extends Adapter>(
  adapter: TAdapter,
  options?: InspectorOptions
): Inspector<TAdapter> {
  function sendAdapter(inspectionEvent: StatelyInspectionEvent): void {
    if (options?.filter && !options.filter(inspectionEvent)) {
      // Event filtered out
      return;
    }

    const sanitizedEvent: typeof inspectionEvent =
      options?.sanitizeContext || options?.sanitizeEvent
        ? inspectionEvent
        : {
            ...inspectionEvent,
          };
    if (
      options?.sanitizeContext &&
      (sanitizedEvent.type === '@xstate.actor' ||
        sanitizedEvent.type === '@xstate.snapshot')
    ) {
      sanitizedEvent.snapshot = {
        ...sanitizedEvent.snapshot,
        // @ts-ignore
        context: options.sanitizeContext(
          // @ts-ignore
          sanitizedEvent.snapshot.context
        ),
      };
    }
    if (
      options?.sanitizeEvent &&
      (sanitizedEvent.type === '@xstate.event' ||
        sanitizedEvent.type === '@xstate.snapshot')
    ) {
      sanitizedEvent.event = options.sanitizeEvent(sanitizedEvent.event);
    }
    const serializedEvent =
      options?.serialize?.(sanitizedEvent) ?? sanitizedEvent;
    adapter.send(serializedEvent);
  }
  const inspector: Inspector<TAdapter> = {
    adapter,
    actor: (actorRef, snapshot, info) => {
      const sessionId =
        typeof actorRef === 'string' ? actorRef : actorRef.sessionId;
      const definitionObject = (actorRef as any)?.logic?.config;
      const definition = definitionObject
        ? safeStringify(definitionObject)
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

      sendAdapter({
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
    event: (target, event, info) => {
      const sessionId = typeof target === 'string' ? target : target.sessionId;
      const sourceId = !info?.source
        ? undefined
        : typeof info.source === 'string'
        ? info.source
        : info.source.sessionId;
      sendAdapter({
        type: '@xstate.event',
        sourceId,
        sessionId,
        event: toEventObject(event),
        id: Math.random().toString(),
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: pkg.version,
      });
    },
    snapshot: (actor, snapshot, info) => {
      const sessionId = typeof actor === 'string' ? actor : actor.sessionId;
      sendAdapter({
        type: '@xstate.snapshot',
        snapshot: {
          status: 'active',
          ...snapshot,
        } as unknown as Snapshot<unknown>,
        event: info?.event ?? { type: '' },
        sessionId,
        id: null as any,
        createdAt: Date.now().toString(),
        rootId: 'anonymous',
        _version: pkg.version,
      });
    },
    inspect: {
      next: (event) => {
        idleCallback(function inspectNext() {
          const convertedEvent = convertXStateEvent(event);
          if (convertedEvent) {
            sendAdapter(convertedEvent);
          }
        });
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
): StatelyInspectionEvent | undefined {
  switch (inspectionEvent.type) {
    case '@xstate.actor': {
      const actorRef = inspectionEvent.actorRef;
      const logic = (actorRef as any)?.logic;
      const definitionObject = logic?.config;
      let name = actorRef.id;

      // TODO: fix this in XState
      if (name === actorRef.sessionId && definitionObject) {
        name = definitionObject.id;
      }
      const definitionString =
        typeof definitionObject === 'object'
          ? safeStringify(definitionObject, (_key, value) => {
              if (typeof value === 'function') {
                return { type: value.name };
              }

              return value;
            })
          : safeStringify({
              id: name,
            });

      return {
        name,
        type: '@xstate.actor',
        definition: definitionString,
        _version: pkg.version,
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
        _version: pkg.version,
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
      } satisfies StatelyEventEvent;
    }
    case '@xstate.snapshot': {
      return {
        type: '@xstate.snapshot',
        event: inspectionEvent.event,
        snapshot: JSON.parse(safeStringify(inspectionEvent.snapshot)),
        sessionId: inspectionEvent.actorRef.sessionId,
        _version: pkg.version,
        createdAt: Date.now().toString(),
        id: null as any,
        rootId: inspectionEvent.rootId,
      } satisfies StatelySnapshotEvent;
    }
    default: {
      // Ignore future XState inspection events (assume that they are valid)
      if (inspectionEvent.type.startsWith('@xstate.')) {
        return undefined;
      }
      console.warn(
        `Unhandled inspection event type: ${(inspectionEvent as any).type}`
      );
      return undefined;
    }
  }
}
