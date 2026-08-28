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
 * Braced values are captured WHOLE and every literal inside is judged, so
 * `cond ? 'A' : 'B'` and `x ?? 'A'` are both caught. The first version anchored
 * on a quote immediately after `={`, which saw neither — and a live violation,
 * Sortable's `ariaLabel ?? 'Reorder item'`, sat in #492's own table the whole
 * time the gate reported the file clean.
 *
 * Known limits, stated rather than discovered later: it does not read JSX text
 * nodes (a separate parse, and the naive regex over-matches TypeScript
 * generics badly), and it cannot see a string assembled in a variable. Inside a
 * braced value, literals preceded by `=` or `[` are skipped as comparison
 * operands and index keys (`typeof x === 'string'`, `props['aria-label']`), so
 * a rendered literal in that position would be missed — the trade is against
 * five false alarms, and a false alarm is what gets a gate deleted.
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
    // Comment lines are stripped WHOLESALE and the rest scanned as one string,
    // so a value prettier wrapped across lines is still seen. Scanning
    // line-by-line missed those.
    const body = code
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/)/.test(l))
      .join('\n');
    {
      // `(?<![-\w])` so `data-title=` / `data-alt=` do not match — `-` is a word
      // boundary, so `\b` alone flagged them and reported a false violation.
      // The braced form captures the WHOLE expression rather than stopping at
      // the first quote, so `cond ? 'A' : 'B'` and `x ?? 'A'` are both seen;
      // the first version anchored on a quote right after `={` and missed both,
      // including a live one at Sortable.tsx.
      for (const m of body.matchAll(
        /(?<![-\w])(aria-[a-z]+|placeholder|title|alt)=(?:\{([^}]*)\}|(["'`])((?:(?!\3).)*)\3)/gs,
      )) {
        const attr = m[1];
        const value = m[2] ?? m[4] ?? '';
        if (NON_TEXTUAL.has(attr!)) continue;
        // Interpolations are permitted — the rule allows mixing translated
        // text with data. What is not permitted is a fixed English phrase.
        // Only the STRING LITERALS inside the expression are judged; a t(…)
        // key is not user-facing text.
        const literals = [...value.matchAll(/(["'`])((?:(?!\1).)*)\1/gs)]
          // Not every literal in the expression is rendered. Drop comparison
          // operands and index keys — `typeof x === 'string'`,
          // `state === 'error'`, `props['aria-label']` — by looking at what
          // precedes them. Without this the wider matcher reports them as
          // English, which is the false-alarm half of a gate people delete.
          .filter((lm) => !/[=[]\s*$/.test(value.slice(0, lm.index)))
          .map((lm) => lm[2]!)
          // A t() key is not user-facing text.
          .filter((lit) => !/^[a-z][a-zA-Z]*\.[a-zA-Z.]+$/.test(lit));
        for (const lit of literals) {
          const bare = lit.replace(/\$\{[^}]*\}/g, '').trim();
          if (/[A-Za-z]{3}/.test(bare)) offenders.push(`${attr}: "${lit}"`);
        }
      }
    }
    expect(
      offenders,
      'inline English on a user-facing attribute — route it through useTranslation()',
    ).toEqual([]);
  });
});

/**
 * A contrast ratio written in a comment is a claim, and nothing checked it.
 *
 * #484 corrected the same class of stale figure FOUR times across thirteen
 * review rounds — Calendar's `4.55`, the Progress family's `4.17`, and two
 * theme-scoping misses — every one found by a person reading, never by a test.
 * A retune moves a primitive and every number describing it silently rots.
 *
 * Numbers opt in by carrying an annotation the gate can resolve:
 *
 *   // @contrast --color-warning on --color-bg = 2.14:1 light
 *
 * Both sides are resolved through the generated tokens for the named theme and
 * the ratio recomputed. A stale number fails with both figures.
 *
 * Scope, stated rather than implied: every `N.NN:1` in a `.tokens.scss` must be
 * annotated, because that is where token-pair ratios live and where the rot
 * happened. Ratios in prose elsewhere (`.ts`/`.tsx`) are not forced — binding a
 * number to its pair needs the author's help, and a gate that demands
 * annotation of arbitrary sentences would be gamed by rewording. Ranges
 * (`5.11-6.82:1`) are exempt for the same reason; annotate the endpoints
 * individually if they matter.
 */
describe('stated contrast ratios still hold', () => {
  function literal(name: string, dark: boolean, seen: string[] = []): string | undefined {
    if (seen.includes(name)) return undefined;
    for (const src of dark ? [DARK_SCSS, TOKENS_SCSS] : [TOKENS_SCSS]) {
      const m = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;\\n]+);`, 'm').exec(src);
      if (!m) continue;
      const raw = m[1]!.trim();
      if (raw.startsWith('var('))
        return literal(raw.slice(4, -1).split(',')[0]!.trim(), dark, [...seen, name]);
      return /^#[0-9a-f]{6}$/i.test(raw) ? raw : undefined;
    }
    return undefined;
  }
  function ratio(a: string, b: string): number {
    const lum = (hex: string) => {
      const c = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
      const [r, g, bl] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
    };
    const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q);
    return (y! + 0.05) / (x! + 0.05);
  }

  const files = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.scss') || (f.endsWith('.ts') && !f.includes('.test.')))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  const annotations = files.flatMap(({ label, code }) =>
    [
      ...code.matchAll(
        /@contrast\s+(--[a-z0-9-]+)\s+on\s+(--[a-z0-9-]+)\s*=\s*([\d.]+):1\s*(light|dark)/g,
      ),
    ].map((m) => ({ label, fg: m[1]!, bg: m[2]!, stated: Number(m[3]), theme: m[4]! })),
  );

  it('found annotations to check', () => {
    expect(annotations.length).toBeGreaterThan(10);
  });

  it.each(annotations.map((a) => [`${a.label}: ${a.fg} on ${a.bg} (${a.theme})`, a]))(
    '%s',
    (_label, a) => {
      const dark = a.theme === 'dark';
      const [fg, bg] = [literal(a.fg, dark), literal(a.bg, dark)];
      expect(fg, `${a.fg} resolves`).toBeDefined();
      expect(bg, `${a.bg} resolves`).toBeDefined();
      expect(ratio(fg!, bg!)).toBeCloseTo(a.stated, 1);
    },
  );

  it.each(
    files
      .filter(({ label }) => label.endsWith('.tokens.scss'))
      .map(({ label, code }) => [label, code]),
  )('%s annotates every ratio it states', (_label, code) => {
    // COUNTED, not "does this file mention @contrast anywhere". The first
    // version fell back to a file-scoped `hasBlockAnnotation`, so any file
    // containing one annotation satisfied the check no matter how many
    // unannotated ratios sat beside it — four were live behind that escape.
    // A gate that cannot fail on its own stated input is the exact thing this
    // suite keeps being written to stop.
    const lines = code.split('\n').filter((l) => /^\s*\/\//.test(l));
    // A range states two endpoints and binds neither; exempt by design.
    const isRange = (l: string) => /\d+\.\d+\s*[-–]\s*\d+\.\d+:1/.test(l);
    const stated = lines.filter((l) => /\d+\.\d+:1/.test(l) && !isRange(l) && !/@contrast/.test(l));
    const annotations = lines.filter((l) => /@contrast/.test(l));
    expect(
      annotations.length,
      `states ${stated.length} ratio(s) but carries ${annotations.length} @contrast annotation(s) — annotate each so it can be recomputed:\n  ${stated.map((l) => l.trim()).join('\n  ')}`,
    ).toBeGreaterThanOrEqual(stated.length);
  });
});
