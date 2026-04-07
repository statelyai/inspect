---
"@statelyai/inspect": minor
---

Add `createInspectorServer()` for inspecting Node.js apps via WebSocket. Import from `@statelyai/inspect/server`. The server relays inspection events to the Stately inspector UI in the browser.

- Add `createInspectorServer()` with event buffering and replay
- Fix `createWebSocketInspector()` not auto-starting the WebSocket connection
- Fix `stop()` crash when called before `start()`
- Remove noisy `console.log` calls from WebSocket adapter and receiver
