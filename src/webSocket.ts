import {
  InspectorOptions,
  createInspector,
  defaultInspectorOptions,
} from './createInspector';
import { Adapter, StatelyInspectionEvent } from './types';
import WebSocket from 'isomorphic-ws';
import safeStableStringify from 'safe-stable-stringify';
import { Observer, Subscribable, toObserver } from 'xstate';

export interface WebSocketInspectorOptions extends InspectorOptions {
  url: string;
}

export class WebSocketAdapter implements Adapter {
  private ws!: WebSocket;
  private status = 'closed' as 'closed' | 'open';
  private deferredEvents: StatelyInspectionEvent[] = [];
  private options: Required<WebSocketInspectorOptions>;
  private safeStringify: ReturnType<typeof safeStableStringify.configure>;

  constructor(options?: WebSocketInspectorOptions) {
    const depthLimit = options?.serializationDepthLimit ?? defaultInspectorOptions.serializationDepthLimit;
    this.safeStringify = safeStableStringify.configure({
      maximumDepth: depthLimit,
    });
    
    this.options = {
      ...defaultInspectorOptions,
      filter: () => true,
      serialize: (inspectionEvent) =>
        JSON.parse(this.safeStringify(inspectionEvent)),
      autoStart: true,
      url: 'ws://localhost:8080',
      ...options,
    };
  }
  public start() {
    const start = () => {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.status = 'open';
        this.deferredEvents.forEach((inspectionEvent) => {
          const preSerializedEvent =
            defaultInspectorOptions.serialize(inspectionEvent);
          const serializedEvent = this.options.serialize(preSerializedEvent);
          this.ws.send(this.safeStringify(serializedEvent));
        });
      };

      this.ws.onclose = () => {
        this.status = 'closed';
      };

      this.ws.onerror = async () => {
        this.status = 'closed';
        await new Promise((res) => setTimeout(res, 5000));
        start();
      };

      this.ws.onmessage = () => {
        // Messages from the server are ignored by the adapter
      };
    };

    start();
  }
  public stop() {
    if (this.ws) {
      this.ws.close();
    }
    this.status = 'closed';
  }
  public send(inspectionEvent: StatelyInspectionEvent) {
    if (this.status === 'open') {
      this.ws.send(this.safeStringify(inspectionEvent));
    } else {
      this.deferredEvents.push(inspectionEvent);

      if (this.deferredEvents.length > this.options.maxDeferredEvents) {
        this.deferredEvents.shift();
      }
    }
  }
}

export function createWebSocketInspector(options?: WebSocketInspectorOptions) {
  const adapter = new WebSocketAdapter(options);

  const inspector = createInspector(adapter, options);

  if (options?.autoStart !== false) {
    inspector.start();
  }

  return inspector;
}

interface WebSocketReceiver extends Subscribable<StatelyInspectionEvent> {}

export function createWebSocketReceiver(options?: {
  server: string;
}): WebSocketReceiver {
  const resolvedOptions = {
    server: 'ws://localhost:8080',
    ...options,
  };

  const observers = new Set<Observer<StatelyInspectionEvent>>();

  const ws = new WebSocket(resolvedOptions.server);

  ws.onopen = () => {
    ws.onmessage = (event: { data: unknown }) => {
      if (typeof event.data !== 'string') {
        return;
      }
      const eventData = JSON.parse(event.data);

      observers.forEach((observer) => {
        observer.next?.(eventData);
      });
    };
  };

  const receiver: WebSocketReceiver = {
    subscribe(observerOrFn) {
      const observer = toObserver(observerOrFn);
      observers.add(observer);

      return {
        unsubscribe() {
          observers.delete(observer);
        },
      };
    },
  };

  return receiver;
}
