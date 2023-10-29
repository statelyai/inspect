import { expect, test } from 'vitest';
import { createInspector } from './createInspector';
import { ActorEvents, Adapter } from './types';
import { createActor, createMachine } from 'xstate';

test('adds 1 + 2 to equal 3', async () => {
  const events: ActorEvents[] = [];
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
      expect(
        events.map((ev) =>
          ev.type === '@xstate.actor'
            ? { type: ev.type, sessionId: ev.sessionId }
            : ev.type === '@xstate.event'
            ? { type: ev.type, sessionId: ev.sessionId, event: ev.event }
            : {
                type: ev.type,
                sessionId: ev.sessionId,
                snapshot: (ev.snapshot as any).value,
              }
        )
      ).toMatchInlineSnapshot(`
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
