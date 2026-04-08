import { createMachine, createActor } from 'xstate';
import { createWebSocketInspector } from './dist/index.mjs';
import { createInspectorServer } from './dist/server.mjs';

// 1. Start the relay server (opens browser automatically)
const server = createInspectorServer({ port: 8080 });

// 2. Create the inspector, pointing at the relay server
const inspector = createWebSocketInspector({
  url: 'ws://localhost:8080',
});

// 3. Create a traffic light machine
const machine = createMachine({
  id: 'trafficLight',
  initial: 'green',
  states: {
    green: {
      after: {
        3000: 'yellow',
      },
    },
    yellow: {
      after: {
        1000: 'red',
      },
    },
    red: {
      after: {
        3000: 'green',
      },
    },
  },
});

const actor = createActor(machine, {
  inspect: inspector.inspect,
});

actor.start();

// Stop after 30 seconds
setTimeout(() => {
  actor.stop();
  inspector.stop();
  server.stop();
}, 30_000);
