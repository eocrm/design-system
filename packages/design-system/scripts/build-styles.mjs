// Global stylesheets for the compiled package (last step of `npm run build`):
//   dist/styles/global.css — tokens + dark + reset + typography (import once)
//   dist/styles/tokens.css — tokens + dark only (no reset), for hosts with their own base
//   dist/styles.css        — global.css + every per-module CSS file, one link for non-bundler hosts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
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

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

// Collected before writing, so the bundle never includes the global files.
const moduleCss = walk(dist)
  .filter((f) => f.endsWith('.css'))
  .map((f) => relative(dist, f))
  .sort();

const global = compile("@use 'global';");
mkdirSync(join(dist, 'styles'), { recursive: true });
writeFileSync(join(dist, 'styles/global.css'), global);
writeFileSync(join(dist, 'styles/tokens.css'), compile("@use 'tokens'; @use 'dark';"));
writeFileSync(
  join(dist, 'styles.css'),
  global + moduleCss.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n'),
);
