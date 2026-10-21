// #673: a custom property set only inline (via `style`) is undefined when the
// component renders without it, so `var(--x)` with no fallback silently
// drops the whole declaration. Every fallback-less read must name a property
// that some stylesheet declares. Heuristic limit: a property declared under
// ANY selector counts as declared everywhere, so a read in a scope the
// declaration never reaches still passes.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.scss') ? [join(dir, e.name)] : [],
  );

// Blank comments (keeping newlines) so line numbers stay right.
const blank = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

describe('custom property fallbacks (#673)', () => {
  it('every var() without a fallback reads a property some stylesheet declares (#673)', () => {
    const files = walk(srcDir).map((f) => ({ f, code: blank(readFileSync(f, 'utf8')) }));
    const declared = new Set<string>();
    // Global tokens come from the generated design-tokens sheet (@forward'ed by styles/tokens.scss).
    const generated = readFileSync(
      join(srcDir, '../../design-tokens/generated/web/tokens.scss'),
      'utf8',
    );
    for (const m of generated.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
    for (const { code } of files)
      for (const m of code.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);

    const offenders: string[] = [];
    for (const { f, code } of files) {
      for (const m of code.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        if (declared.has(m[1])) continue;
        const line = code.slice(0, m.index).split('\n').length;
        offenders.push(`${relative(srcDir, f)}:${line} ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
