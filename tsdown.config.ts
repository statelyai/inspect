import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server.ts',
    'src/uuid-node.ts',
    'src/uuid-browser.ts',
  ],
  // Keep the `#uuid` subpath external so the bare import survives in the
  // bundle and the consumer's runtime/bundler resolves the right condition
  // (browser/worker vs. node) instead of inlining one variant at build time.
  external: ['#uuid'],
});
