# Stately.ai Inspect

The `@statelyai/inspect` package enables developers to visually inspect state transitions and actor communication in any JavaScript/TypeScript app.

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
  inspect: inspector.inspect
});

actor.start();
```

**Browser inspector with anything:**

```ts
import { createBrowserInspector } from '@statelyai/inspect';

const inspector = createBrowserInspector();

// ...

inspector.actor('someActor', {/* initial state */});

inspector.actor('anotherActor', {/* initial state */});

inspector.event('someActor', { type: 'hello' }, {
  target: 'anotherActor'
});

inspector.snapshot('anotherActor', {/* updated state */});
```
