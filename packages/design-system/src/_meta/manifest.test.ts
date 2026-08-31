// Drift detection: re-runs the manifest generator and compares the result
// against the committed `src/components.manifest.json`. Fails if the two
// disagree — that's the signal to re-run
// `node packages/design-system/scripts/generate-manifest.mjs` and commit
// the result.
//
// Also doubles as a structural meta-test: every component in
// `src/components/` must have a cluster assigned, and the import graph
// must be cycle-free.

import { readFileSync } from 'node:fs';
import {
  buildManifest,
  collectImportsFrom,
  MANIFEST_PATH,
  type ComponentManifest,
} from './manifest';

describe('components.manifest.json', () => {
  it('matches what the generator produces (regenerate if this fails)', () => {
    const generated = buildManifest();
    const committed: ComponentManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    expect(generated).toEqual(committed);
  });

  it('matches the generator BYTE FOR BYTE, not just structurally', () => {
    // The check above parses both sides, so reformatting is invisible to it.
    // The file is in .prettierignore precisely to keep it byte-identical to the
    // generator's output — but prettier resolves .prettierignore relative to the
    // CWD, so `prettier --write` run from inside this package silently ignores
    // that entry and reflows the whole file. That happened on #488 and produced
    // 366 lines of churn nothing flagged: prettier skips the file in CI, and
    // this suite only compared parsed objects.
    //
    // Byte comparison is the only thing that sees it. Fix by running
    // `node packages/design-system/scripts/generate-manifest.mjs`, never
    // prettier.
    const expected = `${JSON.stringify(buildManifest(), null, 2)}\n`;
    expect(
      readFileSync(MANIFEST_PATH, 'utf-8'),
      'Manifest bytes drifted — run `node packages/design-system/scripts/generate-manifest.mjs`. ' +
        'Do NOT run prettier on this file: it is in .prettierignore, which prettier resolves ' +
        'relative to its CWD, so a package-local run reflows it silently.',
    ).toBe(expected);
  });

  it('every component has a cluster assigned', () => {
    const manifest = buildManifest();
    const unclassified = Object.entries(manifest)
      .filter(([, entry]) => entry.cluster === null)
      .map(([name]) => name);
    expect(unclassified).toEqual([]);
  });

  it('the dependency graph is acyclic', () => {
    const manifest = buildManifest();
    // DFS-based cycle detection. Any cycle (A depends on B, B depends on A)
    // would be a code smell — components shouldn't reference each other
    // circularly because it implies the boundary between them is wrong.
    const visited = new Set<string>();
    const stack = new Set<string>();
    const cycles: string[] = [];

    function visit(name: string, path: string[]): void {
      if (stack.has(name)) {
        cycles.push([...path, name].join(' → '));
        return;
      }
      if (visited.has(name)) return;
      visited.add(name);
      stack.add(name);
      for (const dep of manifest[name]?.composes ?? []) {
        visit(dep, [...path, name]);
      }
      stack.delete(name);
    }

    for (const name of Object.keys(manifest)) {
      visit(name, []);
    }

    expect(cycles).toEqual([]);
  });

  it('reads nested files, and matches a deeper-than-one-level import', () => {
    // #509 left both halves of this unexercised, which is why it needs a test
    // of its own rather than being taken on trust from the graph. The walk was
    // flat, so RichText/engine — 20 modules — was never read; and
    // FROM_PARENT_PATH matched a single `../`, so even once read, an import
    // from a nested file could not match. Fixing either alone changes nothing,
    // and today the only nested directory has no upward import left (breaking
    // the RichText -> RichTextEditor cycle is what removed it). So the graph
    // looks identical either way and would go on looking identical if this
    // silently reverted.
    //
    // Asserted against synthetic input rather than the tree, so it keeps
    // holding when the tree's nesting changes.
    const nested = collectImportsFrom([
      "import { Thing } from '../../Button';",
      "import { Other } from '../Card';",
    ]);
    expect(nested).toContain('Button');
    expect(nested).toContain('Card');
  });

  it('every component listed in composes exists in the manifest', () => {
    const manifest = buildManifest();
    const names = new Set(Object.keys(manifest));
    const missing: string[] = [];
    for (const [name, entry] of Object.entries(manifest)) {
      for (const dep of entry.composes) {
        if (!names.has(dep)) {
          missing.push(`${name} → ${dep}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('composedBy is the inverse of composes', () => {
    const manifest = buildManifest();
    for (const [name, entry] of Object.entries(manifest)) {
      for (const dep of entry.composes) {
        expect(manifest[dep].composedBy).toContain(name);
      }
      for (const consumer of entry.composedBy) {
        expect(manifest[consumer].composes).toContain(name);
      }
    }
  });
});
