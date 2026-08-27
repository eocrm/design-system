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

/**
 * Hard rule 10: `aria-busy` alone never reaches a screen reader.
 *
 * This asserts ONE thing: a file that sets `aria-busy` also carries one of the
 * sanctioned mechanisms. It deliberately does NOT try to decide whether the
 * mechanism is rendered unconditionally, whether it is wired to the same state,
 * or whether it sits somewhere that would prune it.
 *
 * That restraint is the finding, not a shortcut. Two rounds of review were
 * spent on versions that tried:
 *
 *   v1 matched raw text, so a token name inside a `{/* comment *\/}` satisfied
 *      it, and `ErrorState` both entered and passed the check off a JSDoc
 *      `@example` — trigger and pass, zero runtime code.
 *   v2 stripped comments and rejected `cond && <span role="status">`. It caught
 *      that literal shape and nothing else: wrapping the same conditional
 *      region in a <div> or a fragment passed, because the attribute is no
 *      longer in the opening tag the regex reaches. It also produced two false
 *      alarms — one legitimate conditional region anywhere in a file poisoned
 *      an unrelated correct one, and the natural name-fold shape
 *      `<span className={styles.srOnly}>{loading && t('x')}</span>` was
 *      rejected outright.
 *
 * Deciding "is this JSX conditional, and does it wrap that attribute" needs a
 * parser, not a regex. A gate that answers one question correctly is worth more
 * than one that answers two badly and cries wolf on correct code — the false
 * alarms are the part that gets a gate deleted.
 *
 * So: comments stripped on both sides, mechanism must exist. Placement,
 * conditionality and state-wiring are reviewed by humans and pinned by the
 * per-component tests in Switch/StatusMenu/DataTable, which assert the
 * behaviour rather than the shape.
 */
describe('transient state does not rely on aria-busy alone', () => {
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const sources = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
      .map((f) => ({
        label: `${name}/${f}`,
        code: stripComments(readFileSync(join(dir, f), 'utf-8')),
      }));
  });

  const withAriaBusy = sources.filter(({ code }) => /aria-busy=/.test(code));

  it('found files to check', () => {
    // Guards the guard: a rename of the attribute or a restructure of the tree
    // would otherwise make every assertion below vacuously pass.
    expect(sources.length).toBeGreaterThan(50);
    expect(withAriaBusy.length).toBeGreaterThan(0);
  });

  it.each(withAriaBusy.map(({ label, code }) => [label, code]))(
    '%s carries a live region or a named state word alongside aria-busy',
    (_label, code) => {
      const liveRegion = /role=("|')(status|alert)\1|aria-live=/.test(code);
      // Anchored on the closing brace so `styles.srOnlyDecorativeThing` and
      // `hiddenLabelWrapper` do not count, and required to carry a translated
      // word — a visually-hidden span with no `t()` is decoration.
      const namedState = /styles\.(srOnly|hiddenLabel)\}/.test(code) && /\bt\(/.test(code);
      expect(liveRegion || namedState).toBe(true);
    },
  );
});
