---
"@statelyai/inspect": minor
---

### Breaking changes

- **ESM-only**: the package is now `"type": "module"` and ships `.mjs` / `.d.mts`. Use `import` / `import()` instead of `require()` for `@statelyai/inspect` and `@statelyai/inspect/server`.

### Features

- Add **`createInspectorServer()`** for Node.js inspection via WebSocket; import from **`@statelyai/inspect/server`**. The server relays inspection events to the Stately inspector UI in the browser (with buffering and replay for late connections).

### Fixes

- **`createWebSocketInspector()`** now starts the WebSocket connection reliably.
- **`stop()`** no longer throws if called before **`start()`**.
- Remove noisy **`console.log`** calls from the WebSocket adapter and receiver.

### Chores

- Build with **tsdown** (Rolldown) instead of tsup; align tooling with **`@statelyai/graph`** (pnpm 10, Node 24 in CI, frozen lockfile, **`pnpm verify`**, **publint**).
- Release workflow uses **npm trusted publishing (OIDC)**; drop long-lived **`NPM_TOKEN`** from Actions.
