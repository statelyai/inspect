const { createMachine, createActor } = require('xstate');
const { createWebSocketInspector } = require('./dist/index.js');

const machine = createMachine({
  // a machine that goes back and forth every second
  id: 'counter',
  initial: 'counting',
  states: {
    counting: {
      after: {
        1000: 'not counting',
      },
    },
    'not counting': {
      after: {
        1000: 'counting',
      },
    },
  },
});

const actor = createActor(machine);

const inspector = createWebSocketInspector('ws://localhost:8080');

actor.subscribe((state) => {
  inspector.snapshot(state, actor.sessionId);
  inspector.actor('some actor');
  inspector.event('EVENT');
});

actor.start();
