import type { AnyActorRef, AnyEventObject } from 'xstate';
import { Adapter } from './types';

function toEventObject(event: AnyEventObject | string): AnyEventObject {
  if (typeof event === 'string') {
    return { type: event };
  }

  return event;
}

export interface Inspector {
  snapshot: (sessionId: string, snapshot: any) => void;
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
  actor: (
    actorRef: AnyActorRef | string,
    { definition, parent }?: { definition?: string; parent?: string }
  ) => void;
  stop: () => void;
}

export function createInspector(
  { url }: { url: string },
  adapter: Adapter
): Inspector {
  adapter.start();

  const inspector: Inspector = {
    actor: (actorRef) => {
      const sessionId =
        typeof actorRef === 'string' ? actorRef : actorRef.sessionId;

      adapter.send({
        type: '@xstate.actor',
        actorRef: null as any,
        sessionId,
        createdAt: Date.now().toString(),
        _version: '0.0.1',
        actorSystemId: 'anonymous',
        id: null as any,
      });
    },
    event(event, { source, target }) {
      adapter.send({
        type: '@xstate.event',
        sourceId: source,
        targetId: target,
        event: toEventObject(event),
        id: Math.random().toString(),
        createdAt: Date.now().toString(),
        actorSystemId: 'anonymous',
        _version: '0.0.1',
      });
    },
    snapshot(sessionId, snapshot) {
      adapter.send({
        type: '@xstate.snapshot',
        snapshot,
        event: null as any,
        status: 1,
        sessionId,
        id: null as any,
        createdAt: Date.now().toString(),
        actorSystemId: 'anonymous',
        _version: '0.0.1',
      });
    },
    stop() {
      adapter.stop();
    },
  };

  return inspector;
}
