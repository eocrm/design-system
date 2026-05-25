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
import { buildManifest, MANIFEST_PATH, type ComponentManifest } from './manifest';

describe('components.manifest.json', () => {
  it('matches what the generator produces (regenerate if this fails)', () => {
    const generated = buildManifest();
    const committed: ComponentManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    expect(generated).toEqual(committed);
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
