# Stately.ai Inspect

The `@statelyai/inspect` package enables developers to visually inspect state transitions and actor communication in any JavaScript/TypeScript app.

**Documentation:** [stately.ai/docs/inspector](https://stately.ai/docs/inspector)

## Features

- Visualize state machines
- Visualize sequence diagrams
- Works best with XState
- Can be used with any framework or library (or none at all)

## Usage

**Browser inspector with XState:**

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

**Browser inspector with _anything_:**

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
