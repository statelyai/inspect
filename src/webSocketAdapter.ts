import { createInspector } from '.';
import { Adapter, InspectionEvent } from './types';
import WebSocket from 'isomorphic-ws';

export class WebSocketAdapter implements Adapter {
  private ws!: WebSocket;
  private open = false;
  private deferredEvents: InspectionEvent[] = [];
  constructor(public url: string) {}
  public start() {
    const start = () => {
      // this.ws = new WebSocket('ws://localhost:8080');
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('websocket open');
        this.open = true;
        this.deferredEvents.forEach((event) => {
          this.ws.send(JSON.stringify(event));
        });
      };

      this.ws.onclose = () => {
        console.log('websocket close');
      };

      this.ws.onerror = async (event: unknown) => {
        console.error('websocket error', event);
        await new Promise((res) => setTimeout(res, 5000));
        console.error('restarting');
        start();
      };

      this.ws.onmessage = (event: { data: unknown }) => {
        if (typeof event.data !== 'string') {
          return;
        }

        console.log('websocket', event.data);
      };
    };

    start();
  }
  public stop() {
    this.ws.close();
  }
  public send(event: InspectionEvent) {
    if (this.open) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.deferredEvents.push(event);
    }
  }
}

export function createWebSocketInspector(url: string) {
  const adapter = new WebSocketAdapter(url);

  const inspector = createInspector({ url }, adapter);

  return inspector;
}
