import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

export interface InspectorServerOptions {
  /**
   * Port for the WebSocket and HTTP server.
   * @default 8080
   */
  port?: number;
  /**
   * URL of the Stately inspector UI to embed.
   * @default 'https://stately.ai/inspect'
   */
  url?: string;
  /**
   * Whether to automatically open the inspector in the default browser.
   * @default true
   */
  autoOpen?: boolean;
}

function openBrowser(url: string) {
  const cmd =
    platform() === 'darwin'
      ? 'open'
      : platform() === 'win32'
        ? 'start'
        : 'xdg-open';
  exec(`${cmd} ${url}`);
}

function getBridgeHTML(wsPort: number, inspectorUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Stately Inspector</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body { height: 100%; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe id="inspector" src="${inspectorUrl}"></iframe>
  <script>
    const iframe = document.getElementById('inspector');
    const buffer = [];
    let connected = false;

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === '@statelyai.connected') {
        connected = true;
        buffer.forEach((event) => {
          iframe.contentWindow.postMessage(event, '*');
        });
        buffer.length = 0;
      }
    });

    const ws = new WebSocket('ws://localhost:${wsPort}');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (connected) {
        iframe.contentWindow.postMessage(data, '*');
      } else {
        buffer.push(data);
      }
    };
  </script>
</body>
</html>`;
}

/**
 * Creates a local WebSocket server that bridges inspection events
 * from a Node.js application to the Stately inspector UI in a browser.
 *
 * @example
 * ```ts
 * import { createInspectorServer } from '@statelyai/inspect/server';
 * import { createWebSocketInspector } from '@statelyai/inspect';
 *
 * // Start the server (auto-opens browser)
 * const server = createInspectorServer();
 *
 * // Connect your app
 * const inspector = createWebSocketInspector({
 *   url: 'ws://localhost:8080',
 * });
 * ```
 */
export function createInspectorServer(options?: InspectorServerOptions) {
  const port = options?.port ?? 8080;
  const inspectorUrl = options?.url ?? 'https://stately.ai/inspect';
  const autoOpen = options?.autoOpen ?? true;

  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getBridgeHTML(port, inspectorUrl));
  });

  const wss = new WebSocketServer({ server: httpServer });

  // Buffer recent events so the browser bridge receives events
  // that arrived before it connected
  const eventBuffer: string[] = [];
  const maxBufferSize = 200;

  wss.on('connection', (ws) => {
    // Replay buffered events to new clients (e.g. the browser bridge)
    for (const msg of eventBuffer) {
      ws.send(msg);
    }

    ws.on('message', (data) => {
      const msg = data.toString();

      // Buffer the event
      eventBuffer.push(msg);
      if (eventBuffer.length > maxBufferSize) {
        eventBuffer.shift();
      }

      // Broadcast to all other connected clients
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    if (autoOpen) {
      openBrowser(`http://localhost:${port}`);
    }
  });

  return {
    stop() {
      wss.close();
      httpServer.close();
    },
  };
}
