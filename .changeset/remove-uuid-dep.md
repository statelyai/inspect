---
'@statelyai/inspect': patch
---

Remove the `uuid` dependency in favor of the platform-native `crypto.randomUUID()`, clearing CVE-2026-41907 flagged by downstream security scanners. A `#uuid` subpath import resolves to `node:crypto` in Node and the global `crypto` in browser/worker environments.
