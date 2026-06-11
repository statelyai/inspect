import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Tests run against `src` before any build, so resolve the `#uuid`
      // subpath (which points at `dist` for published consumers) to source.
      '#uuid': fileURLToPath(new URL('./src/uuid-node.ts', import.meta.url)),
    },
  },
});
