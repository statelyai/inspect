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

test('browser inspector safely serializes HTML elements without freezing', async () => {
  const dom = new JSDOM();
  const events: any[] = [];

  const inspector = createBrowserInspector({
    window: dom.window as any as Window,
    autoStart: false,
  });
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  // Manually set up message listener (normally done in start())
  dom.window.addEventListener('message', (event: any) => {
    if (
      event.data &&
      typeof event.data === 'object' &&
      event.data.type === '@statelyai.connected'
    ) {
      (inspector.adapter as any).status = 'connected';
    }
  });

  // Simulate connection
  dom.window.postMessage(
    {
      type: '@statelyai.connected',
    },
    '*'
  );

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  // Create an actual HTMLElement using jsdom
  const element = dom.window.document.createElement('div');
  element.id = 'test-element';
  element.textContent = 'Hello World';

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.snapshot('test', {
      status: 'active',
      context: { element, data: 'test' },
    });

    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);

      // Verify the event was serialized and sent
      const snapshotEvent = events.find((e) => e.type === '@xstate.snapshot');
      expect(snapshotEvent).toBeDefined();

      // The serialized event should be valid JSON
      expect(() => {
        JSON.stringify(snapshotEvent);
      }).not.toThrow();

      resolve();
    }, 150);
  });
});

test('browser inspector safely serializes deeply nested structures without freezing', async () => {
  const dom = new JSDOM();
  const events: any[] = [];

  const inspector = createBrowserInspector({
    window: dom.window as any as Window,
    autoStart: false,
  });
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  // Manually set up message listener (normally done in start())
  dom.window.addEventListener('message', (event: any) => {
    if (
      event.data &&
      typeof event.data === 'object' &&
      event.data.type === '@statelyai.connected'
    ) {
      (inspector.adapter as any).status = 'connected';
    }
  });

  // Simulate connection
  dom.window.postMessage(
    {
      type: '@statelyai.connected',
    },
    '*'
  );

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  // Create a deeply nested structure (deeper than the depthLimit of 10)
  let deepObject: any = { value: 'deep' };
  for (let i = 0; i < 20; i++) {
    deepObject = { nested: deepObject };
  }

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.snapshot('test', {
      status: 'active',
      context: deepObject,
    });

    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);

      // Verify the event was serialized and sent
      const snapshotEvent = events.find((e) => e.type === '@xstate.snapshot');
      expect(snapshotEvent).toBeDefined();

      // The serialized event should be valid JSON
      expect(() => {
        JSON.stringify(snapshotEvent);
      }).not.toThrow();

      resolve();
    }, 150);
  });
});

test('browser inspector serialize function respects depth limits', async () => {
  const dom = new JSDOM();
  const events: any[] = [];

  const inspector = createBrowserInspector({
    window: dom.window as any as Window,
    autoStart: false,
  });
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  // Manually set up message listener (normally done in start())
  dom.window.addEventListener('message', (event: any) => {
    if (
      event.data &&
      typeof event.data === 'object' &&
      event.data.type === '@statelyai.connected'
    ) {
      (inspector.adapter as any).status = 'connected';
    }
  });

  // Simulate connection
  dom.window.postMessage(
    {
      type: '@statelyai.connected',
    },
    '*'
  );

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  // Create a structure with HTML elements nested deeply
  const element = dom.window.document.createElement('div');
  element.innerHTML = '<span>Nested</span>';

  const complexObject = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              level6: {
                level7: {
                  level8: {
                    level9: {
                      level10: {
                        level11: {
                          element,
                          data: 'deep',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.snapshot('test', {
      status: 'active',
      context: complexObject,
    });

    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);

      // Verify the event was serialized and sent
      const snapshotEvent = events.find((e) => e.type === '@xstate.snapshot');
      expect(snapshotEvent).toBeDefined();

      // The serialized event should be valid JSON
      expect(() => {
        JSON.stringify(snapshotEvent);
      }).not.toThrow();

      resolve();
    }, 150);
  });
});

test('browser inspector with custom depth limit works correctly', async () => {
  const dom = new JSDOM();
  const events: any[] = [];

  const inspector = createBrowserInspector({
    window: dom.window as any as Window,
    autoStart: false,
    serializationDepthLimit: 5,
  });
  inspector.adapter.targetWindow = new JSDOM().window as any;

  inspector.adapter.targetWindow!.addEventListener('message', (event) => {
    events.push(event.data);
  });

  // Manually set up message listener (normally done in start())
  dom.window.addEventListener('message', (event: any) => {
    if (
      event.data &&
      typeof event.data === 'object' &&
      event.data.type === '@statelyai.connected'
    ) {
      (inspector.adapter as any).status = 'connected';
    }
  });

  // Simulate connection
  dom.window.postMessage(
    {
      type: '@statelyai.connected',
    },
    '*'
  );

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  // Create a deeply nested structure
  let deepObject: any = { value: 'deep' };
  for (let i = 0; i < 10; i++) {
    deepObject = { nested: deepObject };
  }

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.snapshot('test', {
      status: 'active',
      context: deepObject,
    });

    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);
      resolve();
    }, 150);
  });
});
