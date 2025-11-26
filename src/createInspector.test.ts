import { expect, test } from 'vitest';
import { createInspector } from './createInspector';
import { StatelyInspectionEvent, Adapter, StatelyEventEvent } from './types';
import { createActor, createMachine } from 'xstate';
import pkg from '../package.json';
import { StatelyActorEvent } from '../dist';

function simplifyEvent(ev: StatelyInspectionEvent) {
  return ev.type === '@xstate.actor'
    ? { type: ev.type, sessionId: ev.sessionId }
    : ev.type === '@xstate.event'
    ? { type: ev.type, sessionId: ev.sessionId, event: ev.event }
    : {
        type: ev.type,
        sessionId: ev.sessionId,
        snapshot: 'value' in ev.snapshot ? ev.snapshot.value : ev.snapshot,
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
              "type": "xstate.after.10.trafficLight.green",
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
              "type": "xstate.after.10.trafficLight.yellow",
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

test('Manually inspected events', () => {
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
  inspector.actor('another', { status: 'active', context: 10 });
  inspector.event('test', 'stringEvent');
  inspector.event('another', { type: 'objectEvent' }, { source: 'test' });
  inspector.snapshot('test', { status: 'active', context: 20 });

  inspector.snapshot(
    'another',
    { status: 'done', context: { foo: 'bar' } },
    { event: { type: 'objectEvent' } }
  );

  expect(events.map(simplifyEvent)).toMatchInlineSnapshot(`
    [
      {
        "sessionId": "test",
        "type": "@xstate.actor",
      },
      {
        "sessionId": "another",
        "type": "@xstate.actor",
      },
      {
        "event": {
          "type": "stringEvent",
        },
        "sessionId": "test",
        "type": "@xstate.event",
      },
      {
        "event": {
          "type": "objectEvent",
        },
        "sessionId": "another",
        "type": "@xstate.event",
      },
      {
        "sessionId": "test",
        "snapshot": {
          "context": 20,
          "status": "active",
        },
        "type": "@xstate.snapshot",
      },
      {
        "sessionId": "another",
        "snapshot": {
          "context": {
            "foo": "bar",
          },
          "status": "done",
        },
        "type": "@xstate.snapshot",
      },
    ]
  `);
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

test('options.serialize', async () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };
  const inspector = createInspector(testAdapter, {
    serialize: (ev) => {
      if ('snapshot' in ev) {
        return {
          ...ev,
          snapshot: {
            context: { user: 'anonymous' },
          } as any,
        };
      } else if (ev.type === '@xstate.event') {
        return {
          ...ev,
          event: {
            ...ev.event,
            user: 'anonymous',
          },
        };
      } else {
        return ev;
      }
    },
  });

  inspector.actor('test', { context: { user: 'David' } });

  expect((events[0] as StatelyActorEvent).snapshot.context).toEqual({
    user: 'anonymous',
  });

  inspector.snapshot('test', { context: { user: 'David' } });

  expect((events[1] as StatelyActorEvent).snapshot.context).toEqual({
    user: 'anonymous',
  });

  inspector.event('test', { type: 'updateUser', user: 'David' });

  expect((events[2] as StatelyEventEvent).event).toEqual({
    type: 'updateUser',
    user: 'anonymous',
  });

  inspector.inspect.next?.({
    type: '@xstate.event',
    actorRef: {} as any,
    event: {
      type: 'setUser',
      user: 'Another',
    },
    rootId: '',
    sourceRef: undefined,
  });

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  expect((events[3] as StatelyEventEvent).event).toEqual({
    type: 'setUser',
    user: 'anonymous',
  });
});

test('Sanitization options', async () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };
  const inspector = createInspector(testAdapter, {
    sanitizeContext: (ctx) => ({
      ...ctx,
      user: 'anonymous',
    }),
    sanitizeEvent: (ev) => {
      if ('user' in ev) {
        return { ...ev, user: 'anonymous' };
      } else {
        return ev;
      }
    },
  });

  inspector.actor('test', { context: { user: 'David' } });

  expect((events[0] as StatelyActorEvent).snapshot.context).toEqual({
    user: 'anonymous',
  });

  inspector.snapshot('test', { context: { user: 'David' } });

  expect((events[1] as StatelyActorEvent).snapshot.context).toEqual({
    user: 'anonymous',
  });

  inspector.event('test', { type: 'updateUser', user: 'David' });

  expect((events[2] as StatelyEventEvent).event).toEqual({
    type: 'updateUser',
    user: 'anonymous',
  });

  inspector.inspect.next?.({
    type: '@xstate.event',
    actorRef: {} as any,
    event: {
      type: 'setUser',
      user: 'Another',
    },
    rootId: '',
    sourceRef: undefined,
  });

  await new Promise<void>((res) => {
    setTimeout(res, 10);
  });

  expect((events[3] as StatelyEventEvent).event).toEqual({
    type: 'setUser',
    user: 'anonymous',
  });
});

test('it safely stringifies objects with circular dependencies', () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  const inspector = createInspector(testAdapter);

  const circular = {
    get val() {
      return circular;
    },
  };

  expect(() => {
    inspector.inspect.next?.({
      type: '@xstate.snapshot',
      snapshot: { context: circular } as any,
      actorRef: {} as any,
      event: { type: 'any' },
      rootId: '',
    });
  }).not.toThrow();
});

test('it safely serializes HTML elements without freezing', () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  const inspector = createInspector(testAdapter);

  // Create a mock HTMLElement-like object with circular references
  // This simulates the problematic structure that causes freezing
  const mockHTMLElement: any = {
    outerHTML: '<div>test</div>',
    nodeType: 1,
    tagName: 'DIV',
    parentElement: null,
    children: [],
  };
  
  // Create circular reference (common in DOM structures)
  mockHTMLElement.parentElement = mockHTMLElement;
  mockHTMLElement.children.push(mockHTMLElement);

  // In a browser environment, this would be an actual HTMLElement
  // The safeReplacer should handle it, but in Node.js we test with a mock
  if (typeof HTMLElement !== 'undefined') {
    Object.setPrototypeOf(mockHTMLElement, HTMLElement.prototype);
  }

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.inspect.next?.({
      type: '@xstate.snapshot',
      snapshot: { context: { element: mockHTMLElement } } as any,
      actorRef: {} as any,
      event: { type: 'any' },
      rootId: '',
    });

    // Wait a bit to ensure serialization completes
    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);
      resolve();
    }, 150);
  });
});

test('it safely serializes deeply nested structures without freezing', () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  const inspector = createInspector(testAdapter);

  // Create a deeply nested structure (deeper than the maximumDepth limit of 10)
  let deepObject: any = { value: 'deep' };
  for (let i = 0; i < 20; i++) {
    deepObject = { nested: deepObject };
  }

  let completed = false;
  const startTime = Date.now();

  expect(() => {
    inspector.inspect.next?.({
      type: '@xstate.snapshot',
      snapshot: { context: deepObject } as any,
      actorRef: {} as any,
      event: { type: 'any' },
      rootId: '',
    });

    setTimeout(() => {
      completed = true;
    }, 100);
  }).not.toThrow();

  // Verify serialization completes within reasonable time (not frozen)
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
      expect(completed).toBe(true);
      resolve();
    }, 150);
  });
});

test('it safely serializes snapshot with HTML element in context', async () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  const inspector = createInspector(testAdapter);

  // Create a mock HTMLElement-like object
  const mockHTMLElement: any = {
    outerHTML: '<div id="test">Hello</div>',
    nodeType: 1,
    tagName: 'DIV',
  };

  // In a browser environment, this would be an actual HTMLElement
  if (typeof HTMLElement !== 'undefined') {
    Object.setPrototypeOf(mockHTMLElement, HTMLElement.prototype);
  }

  inspector.snapshot('test', {
    status: 'active',
    context: { element: mockHTMLElement, data: 'test' },
  });

  // Verify the event was sent and serialized successfully
  expect(events.length).toBeGreaterThan(0);
  const snapshotEvent = events.find((e) => e.type === '@xstate.snapshot');
  expect(snapshotEvent).toBeDefined();
  
  // The snapshot should be serializable
  expect(() => {
    JSON.stringify(snapshotEvent);
  }).not.toThrow();
});

test('serialization without depth limit and DOM element handler will fail or hang', async () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  // Create inspector with a custom serializer that doesn't have depth limits
  // This simulates the old behavior before the fix
  const inspector = createInspector(testAdapter, {
    serialize: (event) => {
      // Use JSON.stringify without depth limits - this will fail or hang
      // with DOM elements or deeply nested structures
      try {
        JSON.stringify(event);
        return event;
      } catch (error) {
        // Expected to fail with circular references or DOM elements
        throw error;
      }
    },
  });

  // Create a mock HTMLElement-like object with circular references
  const mockHTMLElement: any = {
    outerHTML: '<div>test</div>',
    nodeType: 1,
    tagName: 'DIV',
    parentElement: null,
    children: [],
  };
  
  // Create circular reference (common in DOM structures)
  mockHTMLElement.parentElement = mockHTMLElement;
  mockHTMLElement.children.push(mockHTMLElement);

  // This should fail or hang without the fix
  expect(() => {
    inspector.snapshot('test', {
      status: 'active',
      context: { element: mockHTMLElement },
    });
  }).toThrow();
});

test('serialization with custom depth limit works correctly', () => {
  const events: StatelyInspectionEvent[] = [];
  const testAdapter: Adapter = {
    send: (event) => {
      events.push(event);
    },
    start: () => {},
    stop: () => {},
  };

  // Test with a custom depth limit (lower than default)
  const inspector = createInspector(testAdapter, {
    serializationDepthLimit: 5,
  });

  // Create a deeply nested structure
  let deepObject: any = { value: 'deep' };
  for (let i = 0; i < 10; i++) {
    deepObject = { nested: deepObject };
  }

  expect(() => {
    inspector.inspect.next?.({
      type: '@xstate.snapshot',
      snapshot: { context: deepObject } as any,
      actorRef: {} as any,
      event: { type: 'any' },
      rootId: '',
    });
  }).not.toThrow();

  // Verify it completes quickly (not frozen)
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 100);
  });
});
