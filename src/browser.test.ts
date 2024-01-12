import { expect, test } from 'vitest';
import { createActor, createMachine } from 'xstate';
import { createBrowserInspector } from './';
import { StatelyActorEvent } from './types';
import { JSDOM } from 'jsdom';

test('inspector observes a state machine', async () => {
  const dom = new JSDOM();

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

  const inspector = createBrowserInspector({
    window: dom.window as any as Window,
  });
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  const trafficLightActor = createActor(trafficLightMachine, {
    inspect: inspector.inspect,
  });
  trafficLightActor.start();

  // simulate getting an event from the inspector
  dom.window.postMessage(
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

test('inspector works with window undefined', async () => {
  const inspector = createBrowserInspector({
    window: undefined,
  });

  const machine = createMachine({});
  const actor = createActor(machine, { inspect: inspector.inspect });

  expect(() => {
    actor.start();
  }).not.toThrow();
});
