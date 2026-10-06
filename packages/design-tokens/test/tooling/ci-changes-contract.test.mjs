import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// Guard: tests outside the playground that read playground files must have those
// paths listed in scripts/ci-changes.sh, or a playground-only PR would skip them.
// Limits: regex over source. It sees any string literal containing `playground/<path>` (files or
// directories) and `'playground'`/`"playground"` segment lists, so a segment path is only
// checked up to its last literal segment. Paths assembled dynamically are invisible.
// Fixture-only files are skipped (they write throwaway paths into temp repos).
const SKIP = new Set(['ci-changes-contract.test.mjs', 'release-change-detection.test.mjs']);

function walk(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

function playgroundPaths(source) {
  const found = new Set();
  for (const m of source.matchAll(/['"`][^'"`\n]*?playground\/((?:[\w.-]+\/?)+)/g))
    found.add(m[1].replace(/\/$/, ''));
  for (const m of source.matchAll(/(['"])playground\1((?:\s*,\s*(['"])[^'"]+\3)+)/g)) {
    found.add([...m[2].matchAll(/(['"])([^'"]+)\1/g)].map((x) => x[2]).join('/'));
  }
  return [...found];
}

test('ci-changes.sh lists every playground file read by library and token tests', () => {
  const files = [
    ...walk('packages/design-system/src').filter((f) => /\.test\.tsx?$/.test(f)),
    ...walk('packages/design-tokens/test').filter(
      (f) => f.endsWith('.mjs') && !SKIP.has(f.split('/').pop()),
    ),
  ];
  const script = read('scripts/ci-changes.sh').replaceAll('\\', '');
  const missing = [];
  for (const f of files) {
    for (const p of playgroundPaths(read(f))) {
      if (!script.includes(`packages/playground/${p}`)) missing.push(`${f} -> ${p}`);
    }
  }
  assert.deepEqual(missing, [], 'add these playground paths to scripts/ci-changes.sh');
});

test('quality.yml `check` job needs every other job', () => {
  const workflow = read('.github/workflows/quality.yml');
  const jobsBlock = workflow.slice(workflow.indexOf('\njobs:\n') + 7);
  const ids = [...jobsBlock.matchAll(/^ {2}([\w-]+):\s*$/gm)].map((m) => m[1]);
  assert.ok(ids.includes('check'));
  const checkJob = jobsBlock.slice(jobsBlock.indexOf('\n  check:'));
  const needs = checkJob
    .match(/needs: \[([^\]]*)\]/)?.[1]
    .split(',')
    .map((s) => s.trim());
  assert.deepEqual([...needs].sort(), ids.filter((i) => i !== 'check').sort());
});
