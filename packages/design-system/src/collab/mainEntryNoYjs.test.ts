// @vitest-environment node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collab = resolve(src, 'collab') + sep;
const exts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const importRe = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

const resolveRel = (from: string, spec: string) =>
  exts
    .map((e) => resolve(dirname(from), spec) + e)
    .find((p) => existsSync(p) && statSync(p).isFile());

it('the main entry never reaches yjs or src/collab/', () => {
  const seen = new Set<string>();
  const bad: string[] = [];
  const stack = [resolve(src, 'index.ts')];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.startsWith(collab)) bad.push(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(importRe)) {
      if (spec === 'yjs' || spec.startsWith('yjs/')) bad.push(`${file} -> ${spec}`);
      else if (spec.startsWith('.')) {
        const r = resolveRel(file, spec);
        if (r) stack.push(r);
      }
    }
  }
  expect(bad).toEqual([]);
  expect(seen.size).toBeGreaterThan(50);
});
