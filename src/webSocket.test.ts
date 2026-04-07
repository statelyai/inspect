import { describe, test, expect, afterEach } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { createWebSocketInspector, WebSocketAdapter } from './webSocket';
import { createInspectorServer } from './server';
import { StatelyInspectionEvent } from './types';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

function startTestWsServer(port: number) {
  const messages: string[] = [];
  const wss = new WebSocketServer({ port });
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      messages.push(data.toString());
    });
  });
  return {
    messages,
    wss,
    stop: () => {
      // Force-close all connections so the server shuts down immediately
      for (const client of wss.clients) {
        client.terminate();
      }
      return new Promise<void>((res) => wss.close(() => res()));
    },
  };
}

describe('WebSocketAdapter', () => {
  let cleanup: (() => Promise<void> | void)[] = [];

  afterEach(async () => {
    for (const fn of cleanup) await fn();
    cleanup = [];
  }, 15000);

  test('connects and sends events to a WS server', async () => {
    const server = startTestWsServer(9101);
    cleanup.push(server.stop);

    const inspector = createWebSocketInspector({ url: 'ws://localhost:9101' });
    cleanup.push(() => inspector.stop());

    await wait(200);

    inspector.actor('testActor', { status: 'active', context: {} });
    inspector.event('testActor', { type: 'PING' });
    inspector.snapshot('testActor', { status: 'active', context: { count: 1 } });

    await wait(100);

    expect(server.messages.length).toBe(3);

    const parsed = server.messages.map((m) => JSON.parse(m));
    expect(parsed[0].type).toBe('@xstate.actor');
    expect(parsed[0].sessionId).toBe('testActor');
    expect(parsed[1].type).toBe('@xstate.event');
    expect(parsed[1].event.type).toBe('PING');
    expect(parsed[2].type).toBe('@xstate.snapshot');
  });

  test('stop() does not throw when called before start()', () => {
    const adapter = new WebSocketAdapter({ url: 'ws://localhost:9999' });
    expect(() => adapter.stop()).not.toThrow();
  });

  test('autoStart: false does not open a connection', async () => {
    const server = startTestWsServer(9103);
    cleanup.push(server.stop);

    const inspector = createWebSocketInspector({
      url: 'ws://localhost:9103',
      autoStart: false,
    });
    cleanup.push(() => inspector.stop());

    inspector.actor('nostart', { status: 'active', context: {} });

    await wait(200);

    // No connection was made, so no messages
    expect(server.messages.length).toBe(0);

    // Now start manually
    inspector.start();
    await wait(200);

    // Deferred events should flush
    expect(server.messages.length).toBeGreaterThanOrEqual(1);
  });
});

describe('createInspectorServer', () => {
  let cleanup: (() => Promise<void> | void)[] = [];

  afterEach(async () => {
    for (const fn of cleanup) await fn();
    cleanup = [];
  }, 15000);

  test('accepts WS connections and broadcasts messages', async () => {
    const server = createInspectorServer({
      port: 9201,
      autoOpen: false,
    });
    cleanup.push(() => server.stop());

    await wait(200);

    const client1 = new WebSocket('ws://localhost:9201');
    const client2 = new WebSocket('ws://localhost:9201');
    const client2Messages: string[] = [];

    client2.onmessage = (event) => {
      client2Messages.push(event.data.toString());
    };

    await new Promise<void>((res) => {
      let ready = 0;
      const check = () => {
        ready++;
        if (ready === 2) res();
      };
      client1.onopen = check;
      client2.onopen = check;
    });

    client1.send(JSON.stringify({ type: '@xstate.actor', sessionId: 'a' }));

    await wait(100);

    expect(client2Messages.length).toBe(1);
    expect(JSON.parse(client2Messages[0]).type).toBe('@xstate.actor');

    client1.close();
    client2.close();
  });

  test('replays buffered events to new clients', async () => {
    const server = createInspectorServer({
      port: 9202,
      autoOpen: false,
    });
    cleanup.push(() => server.stop());

    await wait(200);

    // Client 1 sends events
    const client1 = new WebSocket('ws://localhost:9202');
    await new Promise<void>((res) => {
      client1.onopen = () => res();
    });

    client1.send(JSON.stringify({ type: '@xstate.actor', sessionId: 'x' }));
    client1.send(
      JSON.stringify({ type: '@xstate.event', event: { type: 'GO' } })
    );

    await wait(100);

    // Client 2 connects later — should receive replayed events
    const client2Messages: string[] = [];
    const client2 = new WebSocket('ws://localhost:9202');

    // Set up onmessage BEFORE open so we catch replay messages
    client2.onmessage = (event) => {
      client2Messages.push(event.data.toString());
    };

    await wait(300);

    expect(client2Messages.length).toBe(2);
    expect(JSON.parse(client2Messages[0]).type).toBe('@xstate.actor');
    expect(JSON.parse(client2Messages[1]).type).toBe('@xstate.event');

    client1.close();
    client2.close();
  });

  test('end-to-end: inspector sends events through server', async () => {
    const server = createInspectorServer({
      port: 9203,
      autoOpen: false,
    });
    cleanup.push(() => server.stop());

    await wait(200);

    // Simulate the browser bridge as a WS client
    const bridgeClient = new WebSocket('ws://localhost:9203');
    const received: StatelyInspectionEvent[] = [];

    bridgeClient.onmessage = (event) => {
      received.push(JSON.parse(event.data.toString()));
    };

    await new Promise<void>((res) => {
      bridgeClient.onopen = () => res();
    });

    // Connect the inspector
    const inspector = createWebSocketInspector({ url: 'ws://localhost:9203' });
    cleanup.push(() => inspector.stop());

    await wait(300);

    inspector.actor('myActor', { status: 'active', context: { n: 0 } });
    inspector.event('myActor', { type: 'INC' });
    inspector.snapshot('myActor', { status: 'active', context: { n: 1 } });

    await wait(200);

    expect(received.length).toBe(3);
    expect(received[0].type).toBe('@xstate.actor');
    expect(received[1].type).toBe('@xstate.event');
    expect(received[2].type).toBe('@xstate.snapshot');

    bridgeClient.close();
  });
});
