# @statelyai/inspect

## 0.3.1

### Patch Changes

- [#27](https://github.com/statelyai/inspect/pull/27) [`39279fe`](https://github.com/statelyai/inspect/commit/39279fe6680904f8773331fc7b42a5dbf099a7b8) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Revert serialization changes

## 0.3.0

### Minor Changes

- [#24](https://github.com/statelyai/inspect/pull/24) [`9cfc0b3`](https://github.com/statelyai/inspect/commit/9cfc0b3d8f6703de46dd030fe271f2516e36d1d1) Thanks [@davidkpiano](https://github.com/davidkpiano)! - The `serialize` option will now pre-serialize the event using `superjson` before the custom serialization.

## 0.2.5

### Patch Changes

- [#21](https://github.com/statelyai/inspect/pull/21) [`a225b37`](https://github.com/statelyai/inspect/commit/a225b37c7e466091528bcf275b57488f144b1f47) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Do not warn for XState events

## 0.2.4

### Patch Changes

- [#18](https://github.com/statelyai/inspect/pull/18) [`7d569b1`](https://github.com/statelyai/inspect/commit/7d569b111207d2f9999f2cfa9e270b0c93dc9b9c) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Do not crash on unhandled inspection event type

## 0.2.3

### Patch Changes

- [#12](https://github.com/statelyai/inspect/pull/12) [`c878733`](https://github.com/statelyai/inspect/commit/c8787338e100f45649b14eae49f3eddacefd7df9) Thanks [@mellson](https://github.com/mellson)! - Adds `createSkyInspector`, which allows you to inspect machines in Node or the browser. The inspection will send the events to a server backend through websockets and allows you to open and share a live inspection URL.

## 0.2.2

### Patch Changes

- [#15](https://github.com/statelyai/inspect/pull/15) [`b20b7b7`](https://github.com/statelyai/inspect/commit/b20b7b71722f4f3a68ee17cfad471d89bc1f0e2e) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Use `safe-stable-stringify` everywhere applicable

- [#13](https://github.com/statelyai/inspect/pull/13) [`9d9229d`](https://github.com/statelyai/inspect/commit/9d9229dcd6a83a8d32d65c4f9eca084e7f5b66b0) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Replace fast-safe-stringify with stable-safe-stringify

## 0.2.1

### Patch Changes

- [#8](https://github.com/statelyai/inspect/pull/8) [`ea5bab4`](https://github.com/statelyai/inspect/commit/ea5bab45c581cb8bf76af0c610258bf1c4250466) Thanks [@davidkpiano](https://github.com/davidkpiano)! - Safely stringify snapshots from XState events to deal with circular references

- [#9](https://github.com/statelyai/inspect/pull/9) [`12fe68e`](https://github.com/statelyai/inspect/commit/12fe68efd528d63999e157c4711e6b108e650808) Thanks [@mellson](https://github.com/mellson)! - Update to the latest version of XState and move it to peer dependencies.

## 0.2.0

### Minor Changes

- 3fe7315: Handle window being undefined when trying to create a browser inspector in isomorphic (server/browser) environments
