# Stately.ai Inspect

The `@statelyai/inspect` package enables developers to visually inspect state transitions and actor communication in any JavaScript/TypeScript app.

**Documentation:** [stately.ai/docs/inspector](https://stately.ai/docs/inspector)

## Features

- Visualize state machines
- Visualize sequence diagrams
- Works best with XState
- Can be used with any framework or library (or none at all)
- **Works in Node.js** via WebSocket

## Installation

```bash
npm install @statelyai/inspect
```

## Usage

### Browser inspector with XState

```ts
import { createBrowserInspector } from '@statelyai/inspect';
import { createActor } from 'xstate';
import { machine } from './someMachine';

const inspector = createBrowserInspector();

const actor = createActor(machine, {
  inspect: inspector.inspect,
});

actor.start();
```

### Browser inspector with _anything_

```ts
import { createBrowserInspector } from '@statelyai/inspect';

const inspector = createBrowserInspector();

// ...

inspector.actor('someActor', {
  status: 'active',
  context: {
    /* any context data */
  },
});

inspector.actor('anotherActor');

inspector.event('someActor', 'hello', { source: 'anotherActor' });

inspector.snapshot('anotherActor', {
  status: 'active',
  context: {
    /* any context data */
  },
});
```

### Node.js (WebSocket)

Use `createInspectorServer` and `createWebSocketInspector` to inspect state machines running in Node.js. The server opens the Stately inspector in your browser and relays events from your app to it.

```ts
import { createWebSocketInspector } from '@statelyai/inspect';
import { createInspectorServer } from '@statelyai/inspect/server';
import { createActor } from 'xstate';
import { machine } from './someMachine';

// 1. Start the relay server (opens browser automatically)
const server = createInspectorServer();

// 2. Create the inspector
const inspector = createWebSocketInspector({
  url: 'ws://localhost:8080',
});

// 3. Connect your actors
const actor = createActor(machine, {
  inspect: inspector.inspect,
});

actor.start();
```

#### Server options

```ts
createInspectorServer({
  port: 8080, // default
  url: 'https://stately.ai/inspect', // inspector UI URL
  autoOpen: true, // open browser automatically
});
```

#### Without XState

```ts
import { createWebSocketInspector } from '@statelyai/inspect';
import { createInspectorServer } from '@statelyai/inspect/server';

const server = createInspectorServer();
const inspector = createWebSocketInspector();

inspector.actor('myActor', { status: 'active', context: { count: 0 } });
inspector.event('myActor', { type: 'INCREMENT' });
inspector.snapshot('myActor', { status: 'active', context: { count: 1 } });
```

### WebSocket inspector options

```ts
createWebSocketInspector({
  url: 'ws://localhost:8080', // default
  filter: (event) => true, // filter which events to send
  serialize: (event) => event, // custom serialization
  autoStart: true, // auto-connect on creation
  sanitizeEvent: (event) => event, // remove sensitive event data
  sanitizeContext: (ctx) => ctx, // remove sensitive context data
});
```
