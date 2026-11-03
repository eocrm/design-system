import { defineConfig } from 'vitest/config';

// Runs dist-test/** against the compiled package in dist/ (`npm run build`
// first). Same Node/jsdom split as vitest.config.ts.
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    projects: [
      {
        extends: true,
        test: { name: 'dist-unit', environment: 'node', include: ['dist-test/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'dist-dom', environment: 'jsdom', include: ['dist-test/**/*.test.tsx'] },
      },
    ],
  },
});
