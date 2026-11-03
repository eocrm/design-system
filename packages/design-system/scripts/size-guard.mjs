// Bundle-size guard: builds tiny consumer apps against dist/ (resolved via the
// package name, no `source` condition) and compares gzip sizes to size-budgets.json.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/** One message per overshoot or forbidden string; empty array = pass. */
export function compare(measured, budgets) {
  const out = [];
  for (const [name, b] of Object.entries(budgets)) {
    const m = measured[name];
    if (!m) {
      out.push(`${name}: not measured`);
      continue;
    }
    for (const k of ['jsGzip', 'cssGzip'])
      if (m[k] > b[k]) out.push(`${name}: ${k} ${m[k]} B exceeds budget ${b[k]} B`);
    // Floor catches "css dropped to ~0" (e.g. a bundler tree-shaking it) without flaking.
    if (b.cssGzip && m.cssGzip < b.cssGzip * 0.5)
      out.push(
        `${name}: cssGzip ${m.cssGzip} B is below floor ${b.cssGzip * 0.5} B (50% of budget ${b.cssGzip} B)`,
      );
    for (const s of b.mustNotContain ?? [])
      if (m.output.includes(s)) out.push(`${name}: output must not contain "${s}"`);
  }
  return out;
}

async function measure(name, code, root) {
  const { build } = await import('vite');
  const dir = mkdtempSync(join(tmpdir(), `size-${name}-`));
  try {
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
    writeFileSync(join(dir, 'main.js'), code);
    const ext = ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'];
    const res = await build({
      root: dir,
      logLevel: 'error',
      configFile: false,
      build: {
        write: false,
        rollupOptions: {
          input: join(dir, 'main.js'),
          external: ext,
          // 'use client' directives are expected in the shipped modules
          onwarn(w, next) {
            if (w.code !== 'MODULE_LEVEL_DIRECTIVE') next(w);
          },
        },
      },
    });
    const files = (Array.isArray(res) ? res : [res]).flatMap((r) => r.output);
    const gz = (s) => gzipSync(s, { level: 9 }).length;
    const js = files.filter((f) => f.type === 'chunk').map((f) => f.code);
    const css = files.filter((f) => f.fileName.endsWith('.css')).map((f) => String(f.source));
    return {
      jsGzip: gz(js.join('\n')),
      cssGzip: gz(css.join('\n')),
      output: js.concat(css).join('\n'),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(here, '../../..');
  const budgets = JSON.parse(readFileSync(join(here, '../size-budgets.json'), 'utf8'));
  const measured = {};
  for (const [name, b] of Object.entries(budgets))
    measured[name] = await measure(name, b.code, root);
  console.log(
    'entry'.padEnd(12),
    'js gz'.padStart(8),
    '/ budget'.padStart(9),
    'css gz'.padStart(8),
    '/ budget'.padStart(9),
  );
  for (const [name, b] of Object.entries(budgets)) {
    const m = measured[name];
    console.log(
      name.padEnd(12),
      String(m.jsGzip).padStart(8),
      String(b.jsGzip).padStart(9),
      String(m.cssGzip).padStart(8),
      String(b.cssGzip).padStart(9),
    );
  }
  const errors = compare(measured, budgets);
  if (errors.length) {
    console.error('\nSize guard failed:\n' + errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
  }
}
