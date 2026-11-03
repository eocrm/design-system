import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, dirname, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// Library build: one ESM module per src module (dist/ mirrors src/), CSS per
// module, no minify (consumers minify), no sourcemaps (add when a consumer asks).
const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, 'src');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const externals = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];

const isReact = (id: string) => /^react(-dom)?(\/|$)/.test(id);

// Rolldown strips module-level directives and lib mode does not wire CSS into
// JS, so both are added per chunk: `'use client'` on every module that touches
// React (first statement), and an import of each CSS file the chunk owns.
const useClientAndCss: Plugin = {
  name: 'eocrm-use-client-and-css',
  // generateBundle, not renderChunk: vite fills `importedCss` in its own
  // renderChunk, which runs after a plugin's.
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue;
      const css = [...(chunk.viteMetadata?.importedCss ?? [])].map((file) => {
        const spec = posix.relative(posix.dirname(chunk.fileName), file);
        return `import "${spec.startsWith('.') ? spec : `./${spec}`}";\n`;
      });
      const directive = chunk.imports.some(isReact) ? "'use client';\n" : '';
      chunk.code = directive + css.join('') + chunk.code;
    }
  },
};

export default defineConfig({
  plugins: [useClientAndCss],
  css: {
    modules: {
      // Path-independent (relative to src) so builds are deterministic.
      generateScopedName(local, filename) {
        const file = filename.split('?')[0];
        const hash = createHash('sha256')
          .update(`${relative(src, file).split('\\').join('/')}:${local}`)
          .digest('base64url')
          .slice(0, 5);
        return `${basename(file).replace(/\.module\.scss$/, '')}__${local}__${hash}`;
      },
    },
  },
  build: {
    lib: { entry: resolve(src, 'index.ts'), formats: ['es'] },
    cssCodeSplit: true,
    minify: false,
    rollupOptions: {
      external: (id) => isReact(id) || externals.some((d) => id === d || id.startsWith(`${d}/`)),
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});
