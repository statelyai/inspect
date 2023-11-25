import { expect, test, vi } from 'vitest';
import { createActor, createMachine } from 'xstate';
import { createBrowserInspector } from './browser';
import { StatelyActorEvent } from './types';

test('Inspector observes a state machine', async () => {
  const events: StatelyActorEvent[] = [];
  vi.stubGlobal('window', {
    open: () => ({
      postMessage: (ev: any) => {
        events.push(ev);
      },
    }),
  });
  const trafficLightMachine = createMachine({
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

  const inspect = createBrowserInspector();

  const trafficLightActor = createActor(trafficLightMachine, {
    inspect,
  });
  trafficLightActor.start();

  await new Promise<void>((res) => {
    setTimeout(res, 30);
  });

  expect(events.map((ev) => ev.type)).toMatchInlineSnapshot(`
    [
      "@xstate.actor",
      "@xstate.event",
      "@xstate.snapshot",
      "@xstate.event",
      "@xstate.snapshot",
      "@xstate.event",
      "@xstate.snapshot",
    ]
  `);

  vi.unstubAllGlobals();
});
