import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — plain ESM helper, no type declarations needed for config use.
import { extractProps } from './scripts/extract-props.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Regenerate src/lib/props.manifest.json from the library's TypeScript + JSDoc
// at the start of every dev server and production build, so the demo "API"
// tables can never drift from the shipped component props. The committed copy
// exists only so a fresh checkout type-checks before the first build.
function propsManifestPlugin(): Plugin {
  const outPath = path.resolve(__dirname, 'src/lib/props.manifest.json');
  return {
    name: 'props-manifest',
    buildStart() {
      try {
        writeFileSync(outPath, JSON.stringify(extractProps(), null, 2) + '\n');
      } catch (err) {
        // Non-fatal: fall back to the committed manifest if extraction fails.
        console.warn('[props-manifest] regeneration failed, using committed copy:', err);
      }
    },
  };
}

// GitHub Pages serves at /<repo-name>/, not at /. The deploy workflow sets
// VITE_BASE_PATH to "/<repo-name>/" so asset URLs resolve correctly. Local
// `make up` leaves it unset so assets stay rooted at /.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [propsManifestPlugin(), react()],
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
