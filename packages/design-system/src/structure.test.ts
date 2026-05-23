// Meta-test: codifies the "every component has the four required files and
// is re-exported from src/index.ts" rule from packages/design-system/CLAUDE.md
// so a missing test/export fails CI instead of being caught only at review.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(__dirname, 'components');
const indexPath = join(__dirname, 'index.ts');

const components = readdirSync(componentsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  // Underscore-prefixed directories (e.g. `_internal`) are private helpers
  // shared between components, not components themselves. They have no
  // public export and aren't subject to the four-file rule.
  .filter((name) => !name.startsWith('_'));

const indexContent = readFileSync(indexPath, 'utf-8');

describe('library structure', () => {
  it('discovered at least one component', () => {
    expect(components.length).toBeGreaterThan(0);
  });

  it.each(components)(
    '%s has all four required files (Name.tsx, Name.test.tsx, Name.module.scss, index.ts)',
    (name) => {
      const dir = join(componentsDir, name);
      expect(existsSync(join(dir, `${name}.tsx`))).toBe(true);
      expect(existsSync(join(dir, `${name}.test.tsx`))).toBe(true);
      expect(existsSync(join(dir, `${name}.module.scss`))).toBe(true);
      expect(existsSync(join(dir, 'index.ts'))).toBe(true);
    },
  );

  it.each(components)('%s is re-exported from src/index.ts', (name) => {
    // Match `<Name>` followed by a word boundary OR an uppercase letter.
    // The word-boundary branch catches the exact name (e.g. `Toast` as a
    // standalone export). The uppercase branch allows compound exports whose
    // name starts with `<Name>` (e.g. `ToastViewport` satisfies `Toast`).
    // Crucially, a purely lowercase continuation is NOT matched, so `Button`
    // does NOT accidentally satisfy itself via a hypothetical `Buttons` export,
    // and `Toast` does NOT satisfy `Toasty`. This tightens the earlier
    // `\b${name}[^}]*` form which was over-permissive.
    const namedRe = new RegExp(`export\\s*\\{[^}]*\\b${name}(\\b|[A-Z])[^}]*\\}`);
    const starRe = new RegExp(`export\\s+\\*\\s+from\\s+['"][^'"]*${name}[^'"]*['"]`);
    expect(namedRe.test(indexContent) || starRe.test(indexContent)).toBe(true);
  });
});
