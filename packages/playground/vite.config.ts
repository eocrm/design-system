import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves at /<repo-name>/, not at /. The deploy workflow sets
// VITE_BASE_PATH to "/<repo-name>/" so asset URLs resolve correctly. Local
// `make up` leaves it unset so assets stay rooted at /.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      // Sibling-workspace alias used only by demo pages for `?raw` source-display
      // imports. Keeps the library's `exports` field clean of internal subpaths.
      '@lib-source': path.resolve(__dirname, '../design-system/src'),
    },
  },
  server: {
    port: 8080,
    strictPort: true,
    // Bind to 0.0.0.0 so the dev server is reachable from other machines on
    // the LAN (phones, tablets, sibling dev VMs). `host: true` makes Vite log
    // both the Local and Network URLs on startup.
    host: true,
  },
  preview: {
    port: 8080,
    strictPort: true,
    host: true,
  },
  css: {
    modules: {
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
});
