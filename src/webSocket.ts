import {
  InspectorOptions,
  createInspector,
  defaultInspectorOptions,
} from './createInspector';
import { Adapter, StatelyInspectionEvent } from './types';
import WebSocket from 'isomorphic-ws';
import safeStringify from 'safe-stable-stringify';
import { Observer, Subscribable, toObserver } from 'xstate';

export interface WebSocketInspectorOptions extends InspectorOptions {
  url: string;
}

export class WebSocketAdapter implements Adapter {
  private ws: WebSocket;
  private status = 'closed' as 'closed' | 'open';
  private deferredEvents: StatelyInspectionEvent[] = [];
  private options: Required<WebSocketInspectorOptions>;

  constructor(options?: WebSocketInspectorOptions) {
    this.options = {
      ...defaultInspectorOptions,
      filter: () => true,
      serialize: (inspectionEvent) =>
        JSON.parse(safeStringify(inspectionEvent)),
      autoStart: true,
      url: 'ws://localhost:8080',
      ...options,
    };
  }
  public start() {
    const start = () => {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        console.log('websocket open');
        this.status = 'open';
        this.deferredEvents.forEach((inspectionEvent) => {
          const preSerializedEvent =
            defaultInspectorOptions.serialize(inspectionEvent);
          const serializedEvent = this.options.serialize(preSerializedEvent);
          this.ws.send(safeStringify(serializedEvent));
        });
      };

      this.ws.onclose = () => {
        console.log('websocket closed');
      };

      this.ws.onerror = async (event: unknown) => {
        console.error('websocket error', event);
        await new Promise((res) => setTimeout(res, 5000));
        console.warn('restarting');
        start();
      };

      this.ws.onmessage = (event: { data: unknown }) => {
        if (typeof event.data !== 'string') {
          return;
        }

        console.log('message', event.data);
      };
    };

    start();
  }
  public stop() {
    this.ws.close();
    this.status = 'closed';
  }
  public send(inspectionEvent: StatelyInspectionEvent) {
    if (this.status === 'open') {
      this.ws.send(safeStringify(inspectionEvent));
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
    console.log('websocket open');

    ws.onmessage = (event: { data: unknown }) => {
      if (typeof event.data !== 'string') {
        return;
      }
      console.log('message', event.data);
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
