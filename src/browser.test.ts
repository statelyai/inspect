import { expect, test } from 'vitest';
import { createActor, createMachine } from 'xstate';
import { createBrowserInspector } from './browser';
import { StatelyActorEvent } from './types';
import { JSDOM } from 'jsdom';

test('Inspector observes a state machine', async () => {
  const dom = new JSDOM();
  (globalThis as any).window = dom.window;

  const events: StatelyActorEvent[] = [];

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

  const inspector = createBrowserInspector();
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  const trafficLightActor = createActor(trafficLightMachine, {
    inspect: inspector.inspect,
  });
  trafficLightActor.start();

  // simulate getting an event from the inspector
  window.postMessage(
    {
      type: '@statelyai.connected',
    },
    '*'
  );

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
});
