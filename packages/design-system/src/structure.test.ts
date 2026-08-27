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
 * This walks the tree rather than checking a list, because the list is the
 * thing that rots. The first version of this gate could not fail on ANY of the
 * four inputs its own docstring named — a conditionally-rendered region passed,
 * a region that existed only inside a JSX comment passed, an unrelated
 * `srOnlyDecorativeThing` class passed, and a region wired to the wrong state
 * passed. `ErrorState` even entered the check because of a JSDoc `@example`
 * containing `aria-busy`, then satisfied it off that same JSDoc: trigger and
 * pass both prose, zero runtime code involved.
 *
 * So: comments are stripped before anything is matched, on both sides. A
 * mechanism only counts if it is real JSX, and a live region only counts if it
 * is rendered unconditionally — a region that mounts together with its text is
 * the unreliable case the rule explicitly forbids.
 *
 * Still deliberately coarse: it cannot tell whether the mechanism is wired to
 * the same state as the `aria-busy`, and a component whose transient state
 * never sets `aria-busy` at all is invisible to it. It closes the failure mode
 * that actually happened and stays cheap enough not to rot.
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
    '%s pairs aria-busy with an unconditional live region or a named state word',
    (_label, code) => {
      // A region rendered behind `cond && <span role="status">` mounts with its
      // text, which most screen readers do not announce. Reject it explicitly
      // rather than counting it as a mechanism.
      const conditionalRegion =
        /(\?|&&)\s*\(?\s*<[A-Za-z][^>]*(role=("|')(status|alert)\3|aria-live=)/.test(code);
      const liveRegion =
        !conditionalRegion && /<[A-Za-z][^>]*(role=("|')(status|alert)\2|aria-live=)/.test(code);
      // The other sanctioned mechanism: a visually-hidden span carrying a
      // translated state word. Two things this must NOT do. It must not accept
      // a bare class — an unrelated `srOnlyDecorativeThing` used to. And it
      // must not accept a span that is also a live region, or a
      // conditionally-rendered region slips through here instead: that was
      // still an srOnly span with a t() call in it, so rejecting it on the
      // live-region branch achieved nothing.
      //
      // Note the asymmetry, which is the rule and not an oversight: a live
      // region must be UNCONDITIONAL (mounting it with its text announces
      // nothing), while a name-folded word must be CONDITIONAL (otherwise the
      // state is in the name permanently). Same reason, opposite shapes.
      const namedState =
        /<span(?![^>]*(?:role=|aria-live=))[^>]*(?:hiddenLabel|srOnly)[^>]*>\s*\{?\s*t\(/.test(
          code,
        );
      expect(liveRegion || namedState).toBe(true);
    },
  );
});
