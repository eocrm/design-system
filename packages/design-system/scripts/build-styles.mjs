// Global stylesheets for the compiled package (last step of `npm run build`):
//   dist/styles/global.css — tokens + dark + reset + typography (import once)
//   dist/styles/tokens.css — tokens + dark only (no reset), for hosts with their own base
//   dist/styles.css        — global.css + every per-module CSS file in bundler import order,
//                            one link for non-bundler hosts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileString } from 'sass-embedded';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const require = createRequire(import.meta.url);

// Resolves `@eocrm/design-tokens/...` through the package's `exports` map.
const packageImporter = {
  findFileUrl(url) {
    return url.startsWith('@') ? pathToFileURL(require.resolve(url)) : null;
  },
};

const compile = (source) =>
  compileString(source, {
    loadPaths: [join(root, 'src/styles')],
    importers: [packageImporter],
    style: 'expanded',
  }).css + '\n';

// Value import/export specifiers in source order (same pattern as dist-test/shape.test.ts).
const SPECIFIER =
  /(?:^|[\n;])\s*(?:import|export)\s+(?!type[\s{])(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;

// Component CSS in the order a bundler emits it: depth-first through the dist
// import graph from index.js, each `.css` at its first visit. Alphabetical
// order would let a parent's overrides lose to a child's base rules.
const moduleCss = [];
const seen = new Set();
const visit = (file) => {
  if (seen.has(file)) return;
  seen.add(file);
  if (file.endsWith('.css')) {
    moduleCss.push(file);
    return;
  }
  for (const [, spec] of readFileSync(file, 'utf8').matchAll(SPECIFIER)) {
    if (spec.startsWith('.')) visit(resolve(dirname(file), spec));
  }
};
visit(join(dist, 'index.js'));

const global = compile("@use 'global';");
mkdirSync(join(dist, 'styles'), { recursive: true });
writeFileSync(join(dist, 'styles/global.css'), global);
writeFileSync(join(dist, 'styles/tokens.css'), compile("@use 'tokens'; @use 'dark';"));
writeFileSync(
  join(dist, 'styles.css'),
  global + moduleCss.map((f) => readFileSync(f, 'utf8')).join('\n'),
);
