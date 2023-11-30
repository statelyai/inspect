import { expect, test } from 'vitest';
import { createInspector } from './createInspector';
import { StatelyInspectionEvent, Adapter } from './types';
import { createActor, createMachine } from 'xstate';
import pkg from '../package.json';

function simplifyEvent(ev: StatelyInspectionEvent) {
  return ev.type === '@xstate.actor'
    ? { type: ev.type, sessionId: ev.sessionId }
    : ev.type === '@xstate.event'
    ? { type: ev.type, sessionId: ev.sessionId, event: ev.event }
    : {
        type: ev.type,
        sessionId: ev.sessionId,
        snapshot: (ev.snapshot as any).value,
      };
}

test('Creates an inspector for a state machine', async () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  const inspector = createInspector(testAdapter);

  const machine = createMachine({
    id: 'trafficLight',
    initial: 'green',
    states: {
      green: {
        after: {
          10: 'yellow',
        },
      },
      yellow: {
        after: {
          10: 'red',
        },
      },
      red: {},
    },
  });

  createActor(machine, {
    inspect: inspector.inspect,
  }).start();

  await new Promise<void>((res) => {
    setTimeout(() => {
      expect(events.map(simplifyEvent)).toMatchInlineSnapshot(`
        [
          {
            "sessionId": "x:0",
            "type": "@xstate.actor",
          },
          {
            "event": {
              "input": undefined,
              "type": "xstate.init",
            },
            "sessionId": "x:0",
            "type": "@xstate.event",
          },
          {
            "sessionId": "x:0",
            "snapshot": "green",
            "type": "@xstate.snapshot",
          },
          {
            "event": {
              "type": "xstate.after(10)#trafficLight.green",
            },
            "sessionId": "x:0",
            "type": "@xstate.event",
          },
          {
            "sessionId": "x:0",
            "snapshot": "yellow",
            "type": "@xstate.snapshot",
          },
          {
            "event": {
              "type": "xstate.after(10)#trafficLight.yellow",
            },
            "sessionId": "x:0",
            "type": "@xstate.event",
          },
          {
            "sessionId": "x:0",
            "snapshot": "red",
            "type": "@xstate.snapshot",
          },
        ]
      `);
      res();
    }, 100);
  });
});

test('Inspected event includes version', () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };
  const inspector = createInspector(testAdapter);

  inspector.actor('test');

  expect(events[0]._version).toEqual(pkg.version);
});
