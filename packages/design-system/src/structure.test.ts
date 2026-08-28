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

const TOKENS_SCSS = readFileSync(
  join(__dirname, '../../design-tokens/generated/web/tokens.scss'),
  'utf-8',
);
const DARK_SCSS = readFileSync(
  join(__dirname, '../../design-tokens/generated/web/dark.scss'),
  'utf-8',
);

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
      // Anchored to an opening tag — a bare `[role="status"]` selector literal
      // would otherwise satisfy this (no component source does that today; the
      // anchor is defensive, not a fix for a live pass). `aria-live` must be a
      // value that actually announces: `aria-live="off"` is the attribute
      // present and explicitly disabled, which is not a mechanism.
      // The `aria-live="off"` rejection has to be a NEGATIVE lookahead, not a
      // value match on the aria-live branch: `role="status"` implies polite, so
      // an element carrying both `role="status"` and an explicit
      // `aria-live="off"` matched on the role branch and never had its
      // aria-live inspected. The comment claimed otherwise — fourth time in
      // this PR that a comment named an input the gate could not fail on.
      const liveRegion =
        /<[A-Za-z](?![^>]*aria-live=("|')off\1)[^>]*(role=("|')(status|alert)\3|aria-live=("|')(polite|assertive)\5)/.test(
          code,
        );
      // Scoped to a qualifying span, not two file-wide tests. The `}` anchor
      // rejects `srOnlyDecorativeThing` and `hiddenLabelWrapper`, and the `t(`
      // must sit inside SOME visually-hidden span's children — not necessarily
      // the state one, which a regex cannot identify. Testing them separately
      // meant the `t(` could be anywhere in the file — 70 of 190 component
      // files have one — so
      // EntityChip with BOTH state spans deleted still passed, carried by a
      // decorative hiddenLabel span and an unrelated call. That is the #483
      // regression this gate exists for, third version in a row where the
      // comment named an input the gate could not fail on.
      //
      // Known limits. One IS a current shape: `aria-live={expr}` is rejected,
      // and `Toast` is exactly that — it does not false-alarm only because
      // Toast sets no `aria-busy`. The rest are not current: the opening-tag scan stops
      // at the first `>`, so an arrow function in the tag before the attribute
      // would false-alarm; `t` is hardcoded as the hook's binding; and an
      // element between the span and its `t()` would not match.
      const namedState = /styles\.(srOnly|hiddenLabel)\}[^>]*>[^<]*\bt\(/.test(code);
      expect(liveRegion || namedState).toBe(true);
    },
  );
});

/**
 * No component token may hard-code a value a semantic token already holds.
 *
 * This is the shape #490 asked for, and deliberately NOT another hand-written
 * list: the two gates #484 added were enumerations of tones someone already
 * knew to worry about, and that mechanism failed three review rounds running.
 * It walks every `*.tokens.scss` and compares literal hexes against every
 * generated semantic value.
 *
 * What it catches is the copy-by-hand shape: a component literal that equals a
 * semantic token's value with no `var()` linking them, so the two track each
 * other only by luck. `--color-info` and `--color-accent` were byte-identical
 * for exactly that reason until a retune split them silently, and Badge's 36
 * literals were the same bet at scale.
 *
 * Deliberately NOT flagged: values with no semantic equivalent (the categorical
 * avatar and palette scales are meant to be independent), and anything already
 * written as `var(...)`.
 */
describe('component tokens do not shadow a semantic value', () => {
  const semanticByValue = new Map<string, string[]>();
  for (const src of [TOKENS_SCSS, DARK_SCSS]) {
    for (const m of src.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) {
      const [, name, value] = m;
      const key = value!.toLowerCase();
      semanticByValue.set(key, [...(semanticByValue.get(key) ?? []), name!]);
    }
  }

  // Independent by design: these scales are categorical, not semantic, so
  // sharing a value with a tone is coincidence rather than a broken link.
  const INDEPENDENT = /^--color-(avatar|palette)-/;

  const componentTokenFiles = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tokens.scss'))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  it('found component token files to check', () => {
    expect(componentTokenFiles.length).toBeGreaterThan(10);
    expect(semanticByValue.size).toBeGreaterThan(20);
  });

  it.each(componentTokenFiles.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const shadowed: string[] = [];
    for (const m of code.matchAll(/^\s*(--[a-z0-9-]+):\s*(#[0-9a-f]{6});/gim)) {
      const [, name, value] = m;
      const owners = (semanticByValue.get(value!.toLowerCase()) ?? []).filter(
        (owner) => !INDEPENDENT.test(owner),
      );
      if (owners.length > 0) shadowed.push(`${name} (${value}) === ${owners.join(' / ')}`);
    }
    expect(
      shadowed,
      'hard-coded a value a semantic token already holds — alias it with var() instead, or the two track each other only by luck',
    ).toEqual([]);
  });
});

/**
 * Hard rule 9: no inline English on a user-visible surface.
 *
 * Keyed off the RULE, not off a list of attributes — that enumeration is what
 * made #492's count wrong four times running. Each fix widened one dimension
 * and left another: excluding braces hid values starting with `${…}`; listing
 * `aria-label|placeholder|title` hid `aria-valuetext`; being attribute-keyed at
 * all hid JSX text nodes, which were half the real violations.
 *
 * So the attribute set is derived by EXCLUSION: every `aria-*` is textual
 * unless it is one of the enumerated/ID-valued ones below. A new textual ARIA
 * attribute is caught by default rather than needing to be remembered.
 *
 * Known limits, stated rather than discovered later: it does not read JSX text
 * nodes (a separate parse, and the naive regex over-matches TypeScript
 * generics badly), and it cannot see a string assembled in a variable.
 */
describe('user-facing strings go through the i18n provider', () => {
  /** ARIA attributes whose values are ids, enums, booleans or numbers. */
  const NON_TEXTUAL = new Set([
    'aria-hidden',
    'aria-expanded',
    'aria-selected',
    'aria-checked',
    'aria-disabled',
    'aria-controls',
    'aria-labelledby',
    'aria-describedby',
    'aria-current',
    'aria-orientation',
    'aria-live',
    'aria-atomic',
    'aria-modal',
    'aria-multiselectable',
    'aria-invalid',
    'aria-busy',
    'aria-haspopup',
    'aria-pressed',
    'aria-readonly',
    'aria-required',
    'aria-activedescendant',
    'aria-owns',
    'aria-valuemin',
    'aria-valuemax',
    'aria-valuenow',
    'aria-autocomplete',
    'aria-multiline',
    'aria-level',
    'aria-posinset',
    'aria-setsize',
    'aria-colcount',
    'aria-colindex',
    'aria-rowcount',
    'aria-rowindex',
    'aria-sort',
    'aria-relevant',
    'aria-dropeffect',
    'aria-grabbed',
    'aria-flowto',
    'aria-details',
    'aria-errormessage',
    'aria-keyshortcuts',
  ]);

  const sources = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  it('found sources to check', () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  it.each(sources.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const offenders: string[] = [];
    for (const raw of code.split('\n')) {
      // Skip JSDoc and comment lines — English in an @example is correct.
      if (/^\s*(\*|\/\/)/.test(raw)) continue;
      for (const m of raw.matchAll(/\b(aria-[a-z]+|placeholder|title|alt)=\{?(["'`])(.*?)\2/g)) {
        const [, attr, , value] = m;
        if (NON_TEXTUAL.has(attr!)) continue;
        // Interpolations are permitted — the rule allows mixing translated
        // text with data. What is not permitted is a fixed English phrase.
        const literal = value!.replace(/\$\{[^}]*\}/g, '').trim();
        if (/[A-Za-z]{3}/.test(literal)) offenders.push(`${attr}="${value}"`);
      }
    }
    expect(
      offenders,
      'inline English on a user-facing attribute — route it through useTranslation()',
    ).toEqual([]);
  });
});
