import { createInspector } from './createInspector';
import { Adapter, StatelyInspectionEvent } from './types';
import WebSocket from 'isomorphic-ws';

export class WebSocketAdapter implements Adapter {
  private ws!: WebSocket;
  private status = 'closed' as 'closed' | 'open';
  private deferredEvents: StatelyInspectionEvent[] = [];
  constructor(public url: string) {}
  public start() {
    const start = () => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('websocket open');
        this.status = 'open';
        this.deferredEvents.forEach((event) => {
          this.ws.send(JSON.stringify(event));
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
  public send(event: StatelyInspectionEvent) {
    if (this.status === 'open') {
      this.ws.send(JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
}

export function createWebSocketInspector(url: string) {
  const adapter = new WebSocketAdapter(url);

  const inspector = createInspector(adapter);

  return inspector;
}
