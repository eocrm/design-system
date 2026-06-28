// build-props.mjs — write the props manifest to src/lib/props.manifest.json.
// Run via `npm run build:props`. The Vite plugin (vite.config.ts) calls the same
// extractor on every dev/build so the committed copy can't drift; this CLI exists
// for an explicit one-off regen and as the npm-script entry point.
import { writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractProps } from './extract-props.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'lib', 'props.manifest.json');

const manifest = extractProps();
writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + '\n');

const count = Object.keys(manifest.components).length;
const total = Object.values(manifest.components).reduce((sum, c) => sum + c.props.length, 0);
const typeCount = Object.keys(manifest.types).length;
console.log(
  `props.manifest.json regenerated — ${count} components, ${total} props, ${typeCount} expandable types → ${relative(process.cwd(), OUTPUT_PATH)}`,
);
