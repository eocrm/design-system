import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contrast guard for the foreground/background pairs the library actually
 * ships together.
 *
 * This exists because `--color-warning` (#ff991f) was used as a foreground on
 * `--color-warning-bg-subtle` in three components at once — Calendar, Badge and
 * Alert — measuring 2.01:1, below WCAG AA for text and below 1.4.11's 3:1 for a
 * graphical object. Nothing caught it: the token tests check that values are
 * well-formed and stable, not that a pair is legible, and jsdom computes no
 * colour. So the failure was invisible to every gate the repo had.
 *
 * The pairs below are asserted from the GENERATED token output, so this fails
 * if anyone retunes a primitive, not merely if they edit a component.
 */

const TOKENS = readFileSync(
  resolve(__dirname, '../../../design-tokens/generated/web/tokens.scss'),
  'utf8',
);
const DARK = readFileSync(
  resolve(__dirname, '../../../design-tokens/generated/web/dark.scss'),
  'utf8',
);

/**
 * Resolves a token to a literal colour, following `var(--x)` aliases.
 *
 * Alias-following is not incidental: Avatar's away dot reaches the amber via
 * `--color-presence-away -> --color-palette-amber-fg`, so a check that only understood
 * literals could not see it — and a grep for `var(--color-warning)` in
 * component source could not either. That blind spot is how it survived the
 * first sweep of this very bug.
 */
function tokenValue(name: string, source: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`alias cycle: ${[...seen, name].join(' -> ')}`);
  // Anchored on a boundary so `--foo` cannot match inside `--bar--foo:`. No
  // escaping: every name is a literal `--[a-z0-9-]+` from the lists below, and
  // a half-working escape would be worse than none.
  const pattern = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;\n]+);`, 'm');
  const declare = (from: string) => from.match(pattern)?.[1]?.trim();

  // A token not overridden in dark still has a declaration in light. Reading
  // THAT is fine — but only to learn its shape. Continuing to resolve in the
  // requested scope is what keeps the answer honest.
  const inScope = declare(source);
  const declaration = inScope ?? declare(TOKENS);
  if (declaration === undefined) throw new Error(`${name} is not declared in any scope`);

  const literal = declaration.match(/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/);
  if (literal) {
    // The dangerous case: a LITERAL borrowed from light and reported as dark.
    // That would pass the dark assertion having checked nothing dark.
    if (inScope === undefined) {
      throw new Error(
        `${name} is declared only in the light scope. If that is deliberate — a ` +
          `theme-independent value like --color-fg-on-overlay or --ring-on-scrim — ` +
          `read it through TOKENS explicitly rather than per theme.`,
      );
    }
    return literal[1];
  }

  const alias = declaration.match(/^var\((--[a-z0-9-]+)\)$/);
  if (alias) return tokenValue(alias[1], source, [...seen, name]);
  if (/^#[0-9a-fA-F]+$/.test(declaration)) {
    throw new Error(`${name} is a hex of an unsupported length: "${declaration}"`);
  }
  throw new Error(`${name} resolves to "${declaration}", which is neither a hex nor a var() alias`);
}

/** Strips comments, so prose containing a token name cannot satisfy a match. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * The one way this file is allowed to read a declaration.
 *
 * Every ad-hoc version of this has had the same two holes, and fixing one site
 * never fixed its siblings: a bare `.match()` takes the FIRST declaration while
 * CSS is last-wins, so a later `[data-theme='dark']` or `@media` block silently
 * overrides it; and reading raw text lets the token name in a COMMENT satisfy
 * the assertion while the real declaration says something else. Both shipped
 * here more than once, in gates written to fix each other.
 *
 * So: strip comments, collect EVERY declaration of the name, and refuse to
 * answer unless they agree. Stylelint's duplicate-property rule is
 * block-scoped and does not cover the override case.
 */
function declaredValue(name: string, source: string): string | undefined {
  // `[^;]` not `[^;\n]`: a value may span lines, and --button-bg-selected-hover
  // does (a four-line color-mix). Stopping at the newline made this return
  // undefined for it, so the token resolved `absent` and dropped out of the
  // hover gate entirely while its base stayed opaque — escaping both the
  // exclusion justification and the measurement floor. Values are `;`-terminated
  // in every file this reads, so `;` is the right terminator — and `}` is
  // excluded from the value so a declaration that omits its trailing semicolon
  // (legal as the last one in a block) stops at the block end rather than
  // swallowing everything up to the next `;` anywhere in the file.
  const all = [
    ...stripComments(source).matchAll(new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;}]+);`, 'g')),
  ].map((m) => m[1].replace(/\s+/g, ' ').trim());
  if (!all.length) return undefined;
  const distinct = [...new Set(all)];
  if (distinct.length > 1) {
    throw new Error(`${name} is declared ${all.length} times with different values: ${distinct}`);
  }
  return distinct[0];
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** 4.5 for body text, 3.0 for a graphical object or large text (WCAG 1.4.3 / 1.4.11). */
type Pair = [label: string, fg: string, bg: string, minimum: number];

/**
 * Every pair here is one a component genuinely renders. The `-strong` entries
 * are what this file was written for; the two body-text pairs are the baseline
 * the rest of the UI rests on. #484 retuned the last three sub-AA tones and
 * folded them in, retiring the ratchet that used to hold them. `info` is here
 * too: it needed no retune, but it is a byte-exact copy of the OLD accent in
 * both themes with no alias linking them, so this retune silently split the two
 * blues in dark. Measured rather than assumed, it passes on its own (4.79 dark),
 * and it is pinned so the next retune cannot quietly take it along or leave it
 * behind.
 */
const PAIRS: Pair[] = [
  // The regression: warning as a foreground on its own subtle tint.
  ['warning fg on warning tint', '--color-warning-strong', '--color-warning-bg-subtle', 4.5],
  ['warning graphic on page bg', '--color-warning-strong', '--color-bg', 3.0],
  // The all-day chip inverts it — a solid AMBER fill with text on top — so the
  // fix was the text: --color-warning-fg is now dark. Asserted against the
  // amber, not the strong variant, because keeping the caution hue on a solid
  // chip is the whole point.
  ['warning-fg text on solid warning fill', '--color-warning-fg', '--color-warning', 4.5],
  // Reached through an alias (--color-presence-away -> --color-palette-amber-fg),
  // which is exactly the shape a grep for `var(--color-warning)` cannot see —
  // it is how Avatar's away dot escaped the first sweep.
  ['away presence dot on page bg', '--color-presence-away', '--color-bg', 3.0],
  ['body text on page bg', '--color-fg', '--color-bg', 4.5],
  ['muted text on page bg', '--color-fg-muted', '--color-bg', 4.5],
  // Retuned in #484 — these three were the last sub-AA text pairs. Each failed
  // as text on its own tint and passed as a solid fill, so only lightness moved
  // and hue stays put. The interaction steps are NOT covered by ordering alone:
  // darkening the base collapsed danger's hover step to a third of its size
  // while leaving the order intact, which is what the hover-step gate below now
  // measures. (Only accent has a -pressed; danger and success stop at -hover.)
  ['danger text on danger tint', '--color-danger', '--color-danger-bg-subtle', 4.5],
  ['success text on success tint', '--color-success', '--color-success-bg-subtle', 4.5],
  ['accent text on accent tint', '--color-accent', '--color-accent-bg-subtle', 4.5],
  // The same tones in their OTHER three roles, so a future retune cannot fix
  // the text pair by breaking a fill.
  ['danger-fg on solid danger', '--color-danger-fg', '--color-danger', 4.5],
  ['success-fg on solid success', '--color-success-fg', '--color-success', 4.5],
  ['accent-fg on solid accent', '--color-accent-fg', '--color-accent', 4.5],
  ['info text on info tint', '--color-info', '--color-info-bg-subtle', 4.5],
  // The --color-info shape again, one row over. These two are byte-duplicate
  // LITERALS of the tints above with no alias tying them together, and real
  // components paint on them: --color-bg-danger-subtle carries danger text in
  // DropdownMenu's danger item hover and LiquidEditor;
  // --color-accent-subtle-bg is painted by Rail, Tabs, Select's selected option
  // and Screen. Six files across the two tints, and Screen is the only one that
  // renders nothing in the tone on top: its use is a page gradient. Select
  // appears on both tints and is neither simple case — its selected option
  // keeps --color-fg on the accent tint, and on the danger tint its chip remove
  // control pairs --color-danger with --color-bg-danger-subtle as a
  // 10x10 stroke SVG, so that one is a graphical object at 3:1 rather than
  // text. Retuning a gated twin would leave its duplicate at the stale tint
  // with all of them still rendering on it.
  ['danger text on the duplicate danger tint', '--color-danger', '--color-bg-danger-subtle', 4.5],
  ['accent text on the duplicate accent tint', '--color-accent', '--color-accent-subtle-bg', 4.5],
  // #511. --color-fg-subtle is certified for these two surfaces and no others.
  // It is NOT pinned against --color-bg-muted, and that omission is the rule
  // rather than an oversight: at 4.38/4.29 it would fail. This is a decline,
  // not a fix — no value clears --color-bg-muted without collapsing the tone.
  // #511 moved --color-fg-subtle one notch darker, taking its perceptual
  // distance from --color-fg-muted (ΔE, OKLab) from 0.0387 to 0.0261 in light
  // and 0.0913 to 0.0707 in dark; the light figure was already thin before
  // this PR touched it. 0.0261 still reads as a residual step; the darkest
  // value that clears --color-bg-muted (#667186, contrast 4.507) does not —
  // it lands at ΔE 0.0194, collapsing subtle into muted. The cost lands in
  // light only: at 11px on --color-bg-muted the two tones are now visually
  // indistinguishable there, while dark (0.0707) still reads as a real step.
  // #521 tracks the design decision that follows (move --color-fg-muted,
  // split the retune per theme, or retire the subtle tone) — not resolved
  // here. So the rule stands: text on --color-bg-muted uses tone="muted",
  // whose row is directly below.
  ['subtle text on page bg', '--color-fg-subtle', '--color-bg', 4.5],
  ['subtle text on subtle bg', '--color-fg-subtle', '--color-bg-subtle', 4.5],
  ['muted text on muted bg', '--color-fg-muted', '--color-bg-muted', 4.5],
];

describe.each([
  ['light', TOKENS],
  ['dark', DARK],
])('shipped colour pairs clear WCAG in %s theme', (_theme, source) => {
  it.each(PAIRS)('%s', (_label, fgName, bgName, minimum) => {
    // No light-value fallback here. A token with no dark declaration genuinely
    // DOES render its light value in dark (dark.scss layers overrides on :root),
    // so a fallback would not be wrong — it would just be indistinguishable from
    // a token nobody thought about. tokenValue still resolves alias CHAINS
    // across scopes (that is how --color-presence-away, which has no dark
    // declaration at all, answers correctly here); what it refuses is borrowing
    // a light LITERAL to answer for dark. Silence is the thing to avoid.
    expect(contrast(tokenValue(fgName, source), tokenValue(bgName, source))).toBeGreaterThanOrEqual(
      minimum,
    );
  });
});

/**
 * The slots below are the ones a component actually paints with. PAIRS proves
 * the strong variant clears its bar; this proves the components are still
 * pointed at it, so a token nobody re-aimed cannot quietly keep the old value.
 */
describe('components keep their warning slots on the strong variant', () => {
  const SLOTS: [file: string, tokens: string[]][] = [
    [
      '../components/Calendar/Calendar.tokens.scss',
      [
        '--calendar-event-chip-fg-warning',
        '--calendar-timed-event-fg-warning',
        '--calendar-agenda-tone-warning',
        '--calendar-event-stripe-warning',
      ],
    ],
    [
      '../components/Badge/Badge.tokens.scss',
      ['--badge-stripe-fg-warning', '--badge-stripe-border-color-warning'],
    ],
    [
      '../components/Alert/Alert.tokens.scss',
      ['--alert-icon-warning', '--alert-border-color-warning'],
    ],
    [
      '../components/Toast/Toast.tokens.scss',
      ['--toast-icon-warning', '--toast-border-color-warning'],
    ],
    ['../components/Text/Text.tokens.scss', ['--text-fg-warning']],
    ['../components/Card/Card.tokens.scss', ['--card-stripe-color-warning']],
    ['../components/Progress/Progress.tokens.scss', ['--progress-fill-bg-warning']],
    [
      '../components/CircularProgress/CircularProgress.tokens.scss',
      ['--circular-progress-fill-color-warning'],
    ],
    [
      '../components/Slider/Slider.tokens.scss',
      ['--slider-fill-bg-tone-warning', '--slider-mark-filled-bg-tone-warning'],
    ],
    ['../components/TopBar/TopBar.tokens.scss', ['--topbar-indicator-bg-warning']],
    ['../components/PasswordInput/PasswordInput.tokens.scss', ['--password-input-warning-icon-fg']],
    ['../components/LiquidEditor/LiquidEditor.tokens.scss', ['--liquid-editor-token-number']],
    [
      '../components/PasswordStrengthMeter/PasswordStrengthMeter.tokens.scss',
      [
        '--password-strength-meter-label-fg-score-2',
        '--password-strength-meter-label-fg-score-3',
        '--password-strength-meter-segment-bg-score-2',
        '--password-strength-meter-segment-bg-score-3',
      ],
    ],
  ];

  it.each(SLOTS)('%s', (file, tokens) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8');
    for (const token of tokens) {
      const declared = declaredValue(token, source);
      expect(declared, `${token} is declared`).toBeDefined();
      expect(declared, `${token} must not use --color-warning`).toBe('var(--color-warning-strong)');
    }
  });
});

/**
 * The allowlist above is hand-maintained, which is the exact mechanism that
 * failed three review rounds in a row: `Dot`, `Toast`, `Text`, `Progress`,
 * `Slider` and `CircularProgress` were all missed by someone confidently
 * declaring the sweep complete. So this walks the tree instead of trusting a
 * list — a new component wiring `var(--color-warning)` fails here without
 * anyone having to remember to add a row.
 */
describe('nothing reaches the bare --color-warning except the one deliberate slot', () => {
  const ALLOWED = new Set(['--calendar-event-chip-all-day-bg-warning']);

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(scss|ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
    });
  }

  it('finds only the all-day amber fill', () => {
    const offenders: string[] = [];
    // '..' not '../components': app/, calendar/, palette/ and styles/ are clean
    // today, but scoping the walk to one directory is how the last hole worked.
    for (const file of walk(resolve(__dirname, '..'))) {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      // `--color-warning` exactly — not -strong, -bg-subtle or -fg. Matches both
      // `var(--color-warning)` in SCSS and the quoted form assembled in TS.
      for (const line of source.split('\n')) {
        if (!/--color-warning(?![a-z-])/.test(line)) continue;
        const declared = line.match(/(--[a-z0-9-]+)\s*:/)?.[1] ?? line.trim();
        if (!ALLOWED.has(declared)) {
          offenders.push(`${file.split('/components/')[1]}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the all-day chip keeps its amber fill and dark text', () => {
  it('pairs the amber fill with --color-warning-fg, not the strong variant', () => {
    // This is the pair the PR's judgement call rests on, and it is the one place
    // --color-warning survives on purpose. Pinning both halves: darkening the
    // FILL also cleared the bar but read as chocolate brown, and putting
    // --color-warning-fg on a --color-warning-strong fill measures 2.37:1 while
    // looking plausible. (The other pairing of those two names, strong-as-fg on
    // the amber fill, is 2.79:1 — also failing, and easy to confuse.)
    const scss = readFileSync(
      resolve(__dirname, '../components/Calendar/Calendar.tokens.scss'),
      'utf8',
    );
    expect(declaredValue('--calendar-event-chip-all-day-bg-warning', scss)).toBe(
      'var(--color-warning)',
    );
    expect(declaredValue('--calendar-event-chip-all-day-fg-warning', scss)).toBe(
      'var(--color-warning-fg)',
    );
  });
});

describe('rules without a token name are pinned too', () => {
  it('Dot paints its warning tone with the strong variant', () => {
    // Dot sets `background:` directly inside `&[data-tone='warning']`, so there
    // is no custom property for SLOTS to assert. It was the headline fix of the
    // sweep and had no gate at all until this.
    // Four separate ways this pin has been satisfied by something other than
    // the declaration that renders, each found by mutation:
    //   1. the rule's own comment contains "--color-warning-strong", so a bare
    //      /var\(...\)/ over raw text passed with the declaration swapped;
    //   2. [^}]* stops at the first '}', so a nested block carrying the right
    //      value hid a wrong declaration after it;
    //   3. reading only the first `background:` ignored a second one, and CSS
    //      is last-wins — the same hole the ring gate above already closed;
    //   4. `background:` unanchored also matches `--dot-background:`, which is
    //      the sanctioned refactor under this package's component-token rule.
    // So: strip comments, take the rule with balanced braces, collect EVERY
    // anchored background declaration, and require exactly one.
    const scss = readFileSync(resolve(__dirname, '../components/Dot/Dot.module.scss'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    // Exactly one rule, not the first one. Deduplicating declarations INSIDE
    // the rule while reading the first RULE with indexOf left the same
    // last-wins hole one level up: a second `[data-tone='warning']` block later
    // in the file is what renders. Both sibling gates in
    // Calendar.collisions.test.ts already assert their anchor appears once.
    const selectors = [...scss.matchAll(/\[data-tone='warning'\]/g)];
    expect(selectors.length, 'Dot declares its warning tone exactly once').toBe(1);
    const open = selectors[0].index!;
    let depth = 0;
    let end = scss.indexOf('{', open);
    for (let i = end; i < scss.length; i += 1) {
      if (scss[i] === '{') depth += 1;
      else if (scss[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const rule = scss.slice(open, end + 1);
    // background-color paints over background, and the anchor that excludes
    // --dot-background: also made background-color: invisible. Take both.
    const backgrounds = [
      ...rule.matchAll(/(?:^|[^-a-z0-9])background(?:-color)?:\s*([^;\n]+);/g),
    ].map((m) => m[1].trim());
    expect(backgrounds, "Dot's warning tone paints one background").toHaveLength(1);
    // Follow one hop through Dot.tokens.scss. Requiring the primitive inline
    // rejected `background: var(--dot-background)` — which is the refactor this
    // package's component-token rule actively prefers — so a maintainer doing
    // the sanctioned thing got a red test and no hint.
    let painted = backgrounds[0];
    const alias = /^var\((--dot-[a-z0-9-]+)\)$/.exec(painted)?.[1];
    if (alias) {
      const tokens = readFileSync(resolve(__dirname, '../components/Dot/Dot.tokens.scss'), 'utf8');
      const resolved = declaredValue(alias, tokens);
      expect(resolved, `${alias} is declared once in Dot.tokens.scss`).toBeDefined();
      painted = resolved!;
    }
    expect(painted, "Dot's warning tone resolves to the strong variant").toBe(
      'var(--color-warning-strong)',
    );
  });

  it('RichText offers a legible amber as a text colour', () => {
    // Assembled in TypeScript, so no SCSS grep and no token-file guard could see
    // it — the same blind spot as the alias, one layer over.
    const ts = readFileSync(
      resolve(__dirname, '../components/RichText/engine/colorMarks.ts'),
      'utf8',
    );
    const textVars = ts.match(/DEFAULT_TEXT_VAR[^}]*\}/)?.[0];
    expect(textVars).toMatch(/amber: '--color-warning-strong'/);
  });
});

/**
 * Perceptual distance in OKLab. Raw RGB distance rates a hue shift and a
 * lightness shift the same way; OKLab is the space that answers "can a person
 * tell these apart", which is the actual question everywhere it is used below.
 */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, b2] = [0, 2, 4]
      .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b2);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b2);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b2);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const [x, y] = [lab(a), lab(b)];
  return Math.hypot(...x.map((v, i) => v - y[i]));
}

/**
 * Two invariants that were invisible to this whole suite until a retune broke
 * both of them at once. Neither is about contrast — they are about a token
 * having MORE ROLES than the one being measured, which is the failure this file
 * exists to catch and twice did not.
 */
describe('a tone stays in sync with the roles derived from it', () => {
  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every -hover stays a visible step from its base in %s', (_theme, source) => {
    // Darkening --color-danger collapsed its hover step to 0.025 — a third of
    // what it was, on the DESTRUCTIVE button, where the affordance matters most.
    // Ordering still held, which is why "ordering is unchanged" was the wrong
    // thing to check on its own.
    //
    // The floor is 0.065, anchored to the smallest step among THE THREE TONES
    // THIS GATE COVERS, either theme, before #484 touched anything (light
    // accent, 0.0662). Not the library's smallest and not the smallest
    // primitive: --entity-chip-bg-hover is 0.0000, and --color-table-header-bg's
    // light hover step was 0.0266 until #504 re-pointed it to 0.0453 — still
    // under this anchor, which is the point, but the old figure survived the
    // change that made it false and is corrected here. Two earlier versions of this sentence
    // claimed each of those wider scopes and both were false. That anchor is deliberate: the
    // first version of this gate used 0.05, chosen as "just under the observed
    // floor of 0.058" — but 0.058 was a number #484 had itself created by
    // retuning dark accent without its hover, so the gate was calibrated to
    // accept the very regression it was written to catch. Anchor to what the
    // library managed BEFORE the change under review, never to what it manages
    // after. Read it as a tripwire, not a floor with room: light accent sits at
    // 0.0662, so the headroom is 0.0012 — 1.8%. Any deliberate move here is
    // expected to fail this and be re-argued, which is the intent.
    //
    // #484 moved two other steps and both are recorded here rather than
    // chased: dark accent 0.091 -> 0.058 was retuned back to 0.091, and light
    // success 0.102 -> 0.075 was left, because 0.075 is still healthier than
    // the pre-existing weakest step and shrinking a step is not by itself a
    // defect — falling below what the library already shipped is.
    //
    // This covers three tones, not the library. Plenty of other base/-hover
    // pairs sit below this floor — --button-bg-secondary-hover,
    // --color-table-header-bg, and --entity-chip-bg-hover at exactly 0.0000,
    // where the real hover is a filter rather than the token. No count is
    // quoted: four sweeps produced three different totals because no
    // theme-scoping rule for component tokens is written down. Pinning that
    // rule, and then widening this gate, is #490.
    for (const tone of ['accent', 'danger', 'success'] as const) {
      const base = tokenValue(`--color-${tone}`, source);
      const hover = tokenValue(`--color-${tone}-hover`, source);
      expect(deltaE(base, hover), `${tone} hover step`).toBeGreaterThanOrEqual(0.065);
      // Magnitude alone would pass a hover that moved the WRONG way. The
      // direction is theme-dependent: light hovers darken, dark hovers lighten.
      // A single "hover is darker" assertion would be wrong in half the library.
      const moved = luminance(hover) - luminance(base);
      expect(Math.sign(moved), `${tone} hover direction`).toBe(_theme === 'dark' ? 1 : -1);
    }
  });

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every --ring-* is its tone exactly, in %s', (_theme, source) => {
    // Rewritten for #505. The old version pinned each ring's RGB to its
    // primitive while the rings were TRANSLUCENT rgb() literals, which is what
    // made a light-accent exemption necessary: that ring was a deliberately
    // lighter blue so it would read against the accent fill it surrounds.
    //
    // That exemption is gone, and not by widening it — the reason for it is
    // gone. The rings are opaque now and the separation from the fill comes
    // from `outline-offset` in the focus-ring mixin, which shows the real
    // surface behind the element instead of asking one colour to contrast with
    // two things at once. No ring could have done both: 3:1 on white caps
    // luminance at 0.300, and 3:1 on #0052cc (L 0.1039) needs L >= 0.412 to be
    // the lighter of the pair.
    //
    // An earlier version of this comment quoted 0.337 for that floor and called
    // the constraint impossible full stop. Both were wrong — the floor is
    // 0.412, and the comparison is two-sided, so a ring DARKER than the accent
    // (L <= 0.0013) also clears 3:1; #000000 scores 21:1 on white and 3.08:1 on
    // the fill. It is excluded because it is black — 1.30:1 on the dark theme's
    // background, and no longer tracking the tone it belongs to — not because
    // no such colour exists. The conclusion held; the proof did not, which is
    // the failure mode this file's own prose keeps warning about. The old ring
    // measured 1.64:1 composited on white — the worst of the three, on the tone
    // every focus ring in the library resolves through, and #490 did not catch
    // it because it only measured danger and success.
    //
    // So the relationship is now exact equality with no holes, which is
    // stronger than the hue-band #490 proposed and needs no second end pinned:
    // there is nothing left that is allowed to differ.
    for (const tone of ['accent', 'danger', 'success'] as const) {
      const declared = [...source.matchAll(new RegExp(`--ring-${tone}:\\s*([^;\n]+);`, 'g'))].map(
        (m) => m[1],
      );
      // dark.scss declares every ring twice — once under [data-theme='dark'],
      // once under prefers-color-scheme. Reading only the first let the second
      // copy be mutated freely.
      expect(new Set(declared).size, `--ring-${tone} declarations agree`).toBeLessThanOrEqual(1);
      const ring = declared[0];
      // No fallback to the light source. All three are declared in both files;
      // if one is ever dropped, failing here is better than silently comparing
      // a light triple against a dark tone.
      expect(ring, `--ring-${tone} is declared in ${_theme}`).toBeDefined();
      // Opaque, and said plainly. A ring that regains alpha fails 1.4.11 again
      // — 40% was what put danger at 1.94:1 and success at 1.81:1 — and it
      // would fail here first, with a reason, rather than in the ratio check
      // below with a baffling composite.
      expect(ring, `--ring-${tone} is an opaque hex`).toMatch(/^#[0-9a-f]{6}$/);
      expect(ring, `--ring-${tone} vs --color-${tone}`).toBe(tokenValue(`--color-${tone}`, source));
    }
  });

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every --ring-* clears 1.4.11 against every surface it lands on in %s', (_theme, source) => {
    // The measurement #490 asked for and did not have: it checked the rings
    // against WHITE only. A ring on --color-bg-subtle, on --color-bg-sunken, or
    // inside a Modal composites differently, and sunken is consistently the
    // worst of them — light danger reads 5.41 on white but 4.58 on sunken.
    //
    // Every page surface, not a chosen one. (The note above about sunken being
    // the worst of them is LIGHT-theme only: in dark, sunken is the BEST surface
    // for all three rings and --color-bg-muted is the worst.) --color-bg-overlay is excluded on
    // purpose: it is translucent, so what a ring contrasts with there is the
    // page showing through it, which is already covered by the four below.
    const SURFACES = [
      '--color-bg',
      '--color-bg-subtle',
      '--color-bg-sunken',
      '--color-bg-muted',
    ] as const;
    for (const tone of ['accent', 'danger', 'success'] as const) {
      const ring = tokenValue(`--ring-${tone}`, source);
      for (const surface of SURFACES) {
        const ratio = contrast(ring, tokenValue(surface, source));
        // 3:1 is WCAG 1.4.11 for a non-text indicator. The margin is real and
        // meant to stay real — the tightest pair here is 4.33:1, so this is not
        // a tripwire sitting on the current value the way the hover floors are.
        expect(ratio, `--ring-${tone} on ${surface}`).toBeGreaterThanOrEqual(3.0);
      }
    }
  });

  it('an inset ring stays inside the border box', () => {
    // Several call sites draw the ring inset with `calc(-1 * var(--ring-offset))`,
    // because their focusable sits flush against a clipping ancestor. That puts
    // the band at [border-box - offset, border-box - offset + width], so it is
    // fully inside ONLY while width <= offset. Nothing asserted the relation,
    // and raising --ring-width to 3px — a plausible 1.4.11 tweak — would push
    // every one of them 1px back outside and start the clipping again, with no
    // gate to notice. That is the failure this branch already shipped once.
    const px = (name: string) =>
      Number(/^(\d+(?:\.\d+)?)px$/.exec(declaredValue(name, TOKENS)!)![1]);
    expect(px('--ring-width'), 'an inset ring leaks outside the border box').toBeLessThanOrEqual(
      px('--ring-offset'),
    );
  });

  it('the scrim ring clears 1.4.11 on chrome that is dark in both themes', () => {
    // The four page surfaces above are not every surface a ring lands on, and
    // the gap is not hypothetical: Lightbox paints its chrome on
    // --color-bg-overlay-strong, which is 92% opaque and therefore does NOT let
    // the page through the way --color-bg-overlay does. That chrome is dark in
    // both themes, so in LIGHT theme the tone rings measured 1.03-3.30:1 across
    // its four surfaces: 10 of those 12 cells under 3:1, and --ring-accent —
    // which every focus ring in the library resolves through — under it on all
    // four, 1.03-2.47
    // — failing 1.4.11 on a branch whose gate claimed to certify exactly that.
    //
    // Not an it.each over themes, deliberately. A theme-independent surface
    // needs a theme-independent ring, so the FIRST thing asserted is that the
    // ring has no dark override at all; tokenValue() refuses to read a
    // light-only literal for dark, and that refusal is correct in general, so
    // the exception is stated here rather than worked around.
    expect(
      declaredValue('--ring-on-scrim', DARK),
      '--ring-on-scrim must not be themed — the surface it lands on is not',
    ).toBeUndefined();

    const composite = (over: string, alpha: number, base: string) => {
      const [x, y] = [over, base].map((h) =>
        [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16)),
      );
      return `#${x
        .map((c, i) =>
          Math.round(c * alpha + y[i] * (1 - alpha))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
    };

    // Resolved from the COMPONENT files, not from --ring-on-scrim directly.
    // Asserting the token in isolation proves only that a safe colour exists —
    // it stays green if Lightbox re-points --lightbox-ring back at
    // --ring-accent, which is precisely how the image thumbnails kept the
    // failing ring through the first fix for this. Every ring that lands on the
    // scrim has to be named here and resolved through the component's own
    // aliases, so the gate fails when the COMPONENT changes, not only when the
    // token does.
    const lightbox = stripComments(
      readFileSync(resolve(COMPONENTS_DIR_FOR_SCRIM, 'Lightbox/Lightbox.tokens.scss'), 'utf8'),
    );
    const scrimRings = ['--lightbox-ring', '--lightbox-thumb-active-ring'] as const;
    for (const name of scrimRings) {
      const declared = declaredValue(name, lightbox);
      expect(declared, `${name} is declared`).toBe('var(--ring-on-scrim)');
    }
    // The thumbnails are <Image interactive>, which paints its OWN ring from
    // --image-ring; Lightbox has to hand it the scrim ring or the default
    // --ring-accent comes back at 2.47:1 on the strip in light.
    //
    // Every assertion below is keyed to an EXACT SELECTOR, not to text anywhere
    // in the file. Three separate greps here were each satisfied without the
    // behaviour being right: a `@include` count that one include anywhere
    // contents, a file-wide match for the handoff that a dead rule contents, and
    // a `.thumb` block regex that `.neverRendered .thumb` contents (and `exec`
    // takes the first match, so it wins). All three are the same mistake —
    // asserting that a string appears rather than that a rule says it — which is
    // the mistake this whole file keeps re-learning.
    // A real walker, not a regex. Three earlier versions of this binding were
    // each defeated by the next level of indirection: a file-wide grep (any
    // text), then an innermost-block regex (any block, at any depth, under any
    // condition), then that plus a duplicate check. What defeats a
    // depth-blind matcher is one line of nesting —
    //
    //   .neverRenderedAncestor { .thumb { --image-ring: var(--lightbox-ring) } }
    //   @media (min-width: 99999px) { .close:focus-visible { … } }
    //
    // — both of which satisfied it while the live rule had nothing. So this
    // resolves nesting the way Sass does, expanding `&` and joining descendants,
    // and refuses anything inside an at-rule, because a conditional rule is not
    // the rule that always applies.
    const topLevelRules = (css: string): { selectors: string[]; body: string }[] => {
      const found: { selectors: string[]; body: string }[] = [];
      const walk = (text: string, parents: string[], conditional: boolean) => {
        let index = 0;
        let start = 0;
        while (index < text.length) {
          if (text[index] === ';') {
            start = ++index;
            continue;
          }
          if (text[index] !== '{') {
            index += 1;
            continue;
          }
          let depth = 1;
          let close = index + 1;
          for (; close < text.length && depth > 0; close += 1) {
            if (text[close] === '{') depth += 1;
            else if (text[close] === '}') depth -= 1;
          }
          const header = text.slice(start, index).trim();
          const body = text.slice(index + 1, close - 1);
          if (header.startsWith('@')) {
            walk(body, parents, true);
          } else {
            const parts = header
              .split(',')
              .map((part) => part.replace(/\s+/g, ' ').trim())
              .filter(Boolean);
            const selectors =
              parents.length === 0
                ? parts
                : parents.flatMap((parent) =>
                    parts.map((part) =>
                      part.includes('&') ? part.replace(/&/g, parent) : `${parent} ${part}`,
                    ),
                  );
            // Declarations belonging to THIS rule, not to its nested children.
            // `[^{};]*` and a fixpoint, not one pass of `[^{}]*`: the greedy form
            // swallowed the parent's OWN declarations whenever they preceded a
            // nested child (false fail), and left a grandchild's declarations
            // attributed to the parent when nesting went two deep (false pass —
            // a `--image-ring` on `.thumb .inner` satisfied `.thumb`). Stopping
            // at `;` keeps sibling declarations, and iterating strips each layer
            // of nesting rather than only the innermost.
            if (!conditional) {
              let own = body;
              for (let previous = ''; own !== previous; ) {
                previous = own;
                own = own.replace(/[^{};]*\{[^{}]*\}/g, '');
              }
              found.push({ selectors, body: own });
            }
            walk(body, selectors, conditional);
          }
          index = close;
          start = close;
        }
      };
      walk(css, [], false);
      return found;
    };

    // Every rule with the selector, and it refuses to answer unless there is
    // exactly one — returning the first was the same last-wins hole
    // declaredValue() closes for declarations and the Dot gate closes with
    // `expect(selectors.length).toBe(1)`. stylelint's no-duplicate-selectors is
    // not enabled by this repo's config, so nothing else catches it.
    const ruleBody = (css: string, selector: string): string | undefined => {
      const bodies = topLevelRules(css)
        .filter((rule) => rule.selectors.includes(selector))
        .map((rule) => rule.body);
      if (bodies.length > 1) {
        throw new Error(
          `${selector} is declared ${bodies.length} times; CSS is last-wins, so this gate ` +
            `cannot say which one applies. Merge them.`,
        );
      }
      return bodies[0];
    };

    const lightboxCss = stripComments(
      readFileSync(resolve(COMPONENTS_DIR_FOR_SCRIM, 'Lightbox/Lightbox.module.scss'), 'utf8'),
    );

    // Each of the four chrome controls by name. Asserting only "every include
    // takes the scrim ring" bound the ARGUMENT but not the CALL SITE: narrowing
    // the grouped selector to `.close:focus-visible`, or renaming it to
    // something nothing renders, left the other three on the UA outline with the
    // whole suite green.
    for (const control of ['.close', '.download', '.chev', '.thumbDoc']) {
      const body = ruleBody(lightboxCss, `${control}:focus-visible`);
      expect(body, `${control} takes a focus ring`).toBeDefined();
      expect(body!.replace(/\s+/g, ''), `${control} takes the scrim ring`).toContain(
        '@includefocus-ring(var(--lightbox-ring))',
      );
    }
    // And no OTHER include in the file may quietly take a different ring.
    for (const [, arg] of lightboxCss.matchAll(/@include\s+focus-ring([^;]*);/g)) {
      expect(arg.replace(/\s+/g, ''), 'every Lightbox focus ring takes the scrim ring').toBe(
        '(var(--lightbox-ring))',
      );
    }

    // `.thumb` exactly — not any selector ENDING in `.thumb`. Only `.thumb` is
    // the Image wrapper's ancestor, so only `.thumb` can hand the property down.
    const thumbBody = ruleBody(lightboxCss, '.thumb');
    expect(thumbBody, '.thumb is declared').toBeDefined();
    expect(thumbBody, 'the thumbnails must hand Image the scrim ring').toMatch(
      /--image-ring:\s*var\(--lightbox-ring\)/,
    );

    // BOTH ends of the handoff, and the receiving end keyed to the rule that
    // actually paints. A file-wide match here was satisfied by a dead rule while
    // the real one went back to the bare mixin — the round-2 failure relocated
    // rather than closed, twice.
    const imageCss = stripComments(
      readFileSync(resolve(COMPONENTS_DIR_FOR_SCRIM, 'Image/Image.module.scss'), 'utf8'),
    );
    const imageRing = ruleBody(imageCss, '.wrapper:has(.trigger:focus-visible)');
    expect(imageRing, 'Image paints a focus ring').toBeDefined();
    expect(imageRing!.replace(/\s+/g, ''), 'Image must actually consume --image-ring').toContain(
      '@includefocus-ring(var(--image-ring))',
    );

    const ring = tokenValue('--ring-on-scrim', TOKENS);

    // Read from the token rather than transcribed. A designer nudging the scrim
    // to 88% would otherwise leave this certifying a surface that no longer
    // exists — the failure this whole file keeps closing.
    const overlay = declaredValue('--color-bg-overlay-strong', TOKENS)!;
    // Same percentage-alpha guard as layer() below. Without it `rgb(15 23 42 / 0.92)`
    // parses to alpha 0.0092 and the gate certifies a surface that is not there.
    expect(overlay, '--color-bg-overlay-strong states alpha as a percentage').toMatch(
      /\/\s*[\d.]+%\s*\)/,
    );
    const [or, og, ob, oa] = overlay.match(/[\d.]+/g)!.map(Number);
    expect(oa, '--color-bg-overlay-strong has a meaningful alpha').toBeGreaterThan(5);
    const overlayHex = `#${[or, og, ob].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

    // Both themes' page colours, because the scrim composites over whichever
    // one is behind it — and light is the worse of the two, which is the case
    // that was failing.
    for (const [theme, source] of [
      ['light', TOKENS],
      ['dark', DARK],
    ] as const) {
      const scrim = composite(overlayHex, oa / 100, tokenValue('--color-bg', source));
      // Both layered ON the scrim, and both read from Lightbox's own tokens for
      // the same reason the scrim is: a transcribed alpha keeps certifying a
      // surface that has since moved.
      const layer = (name: string) => {
        const raw = declaredValue(name, lightbox)!;
        // Percentage alpha only. `rgb(0 0 0 / 0.3)` is legal CSS and would parse
        // to 0.003 here, compositing to something indistinguishable from the
        // bare scrim — the assertion would then pass having measured the wrong
        // surface. Fail loudly on the notation instead of quietly on the value.
        expect(raw, `${name} states alpha as a percentage`).toMatch(/\/\s*[\d.]+%\s*\)/);
        const [r, g, b, a] = raw.match(/[\d.]+/g)!.map(Number);
        // The notation check alone is not enough: `rgb(0 0 0 / 0.3%)` is legal,
        // passes it, and parses to alpha 0.003 — compositing to something
        // indistinguishable from the bare scrim, so the assertion would certify
        // a surface that is not there. That is verbatim the failure the notation
        // check was added to prevent, one notation over.
        expect(a, `${name} has a meaningful alpha`).toBeGreaterThan(5);
        return composite(
          `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`,
          a / 100,
          scrim,
        );
      };
      const surfaces: [string, string][] = [
        ['the scrim', scrim],
        ['the thumb strip', layer('--lightbox-thumb-strip-bg')],
        ['a control fill', layer('--lightbox-control-bg')],
        // The hover fill is a distinct surface a focused control can sit on.
        ['a hovered control fill', layer('--lightbox-control-bg-hover')],
      ];
      for (const [label, surface] of surfaces) {
        expect(
          contrast(ring, surface),
          `--ring-on-scrim on ${label} in ${theme}`,
        ).toBeGreaterThanOrEqual(3.0);
      }
    }
  });
});

const COMPONENTS_DIR_FOR_SCRIM = resolve(__dirname, '../components');

describe('presence dots stay distinguishable from each other', () => {
  // Every dot is aria-hidden with no text alternative (Avatar.tsx), and status
  // never reaches the accessible name or the tooltip — colour is the entire
  // channel. What this measures is NORMAL TRICHROMATIC separation; it is not a
  // WCAG 1.4.1 conformance claim and cannot be one, because OKLab ΔE is blind
  // to dichromacy. Under simulated protanopia light amber/busy collapses by an
  // order of magnitude — order 0.01-0.02 depending on the simulation; three
  // implementations of Brettel 1997 and Vienot 1999 disagreed in the second
  // decimal, so treat every CVD figure in this block as an order of magnitude
  // and not a measurement — while
  // this gate reads 0.158 and passes. (Machado 2009 at full severity gives
  // ~0.08: still a collapse, but the methods disagree enough that only the
  // direction is worth quoting.)
  //
  // No AMBER-OR-YELLOW candidate escapes that, and `away` has to read as
  // yellow, so within the constraint the palette is not the lever — the remedy
  // is a second channel (text alternative or dot shape).
  //
  // BOTH SHIPPED IN #506, which is why this block is still worth keeping and
  // still not a 1.4.1 claim. Avatar now folds `status` into the accessible name
  // and gives each status its own silhouette (filled / half / barred / hollow),
  // asserted in Avatar.test.tsx against the compiled stylesheet — a check that
  // has to live there because the channel is a SHAPE and nothing measurable
  // from a token can see it. What remains below is the trichromatic floor:
  // still worth holding so the dots do not collapse for users who rely on
  // colour, but no longer the only thing standing between this component and
  // 1.4.1.
  //
  // (Three successive attempts to add "and here is how much better an
  // unconstrained hue would do" were each wrong in a different way — a
  // borrowed figure, then a light-only one, then one measured against a
  // different pair-set than this gate uses. No gate checks a number in a
  // comment, so the comparison is gone rather than corrected a fourth time.
  // If it matters, measure it in #490 where it can be asserted.)
  //
  // Under that same simulation the dots' own pairs go under this block's 0.13
  // floor there — but say WHICH, because the two themes differ and an earlier
  // version of this sentence did not:
  //
  //   away/online   ~0.12 light, ~0.08 dark   under the floor in BOTH
  //   busy/online   ~0.13 light, ~0.19 dark   under in LIGHT ONLY, and only
  //                                           just: 0.126-0.129 on Vienot and
  //                                           Brettel, a 1-3% margin
  //
  // That is the stronger argument for #490 — the separation this gate enforces
  // is not separation everyone gets, and for away/online it is not close.
  //
  // This gated only away/busy, and in raw RGB distance. Both were wrong, and
  // the second one cost a bad decision inside this very PR:
  //
  //   Darkening --color-danger (which --color-presence-busy aliases) dropped
  //   amber/busy from 105 to 86 RGB, tripping the old floor. The fix looked
  //   obvious — move away to palette.yellow, which scores 105. In OKLab that
  //   trade is backwards where it counts. Yellow buys busy (0.158 -> 0.191) by
  //   spending online (0.153 -> 0.118), and the binding constraint is the WORST
  //   pair, not whichever one happened to fail.
  //
  //   That verdict is LIGHT-THEME only, and worth stating precisely because the
  //   next person will re-derive it: in dark, yellow's worst AWAY-pair is the
  //   better of the two (0.215 vs amber's 0.199). Worst away-pair, not worst
  //   pair — #506 re-pointed offline to --color-fg-subtle and online/offline
  //   became the binding pair in dark too, where amber and yellow TIE at 0.196
  //   because neither is in it. An earlier version of this sentence said "worst
  //   pair" and was right when written, then the same branch invalidated it two
  //   commits later. The global worst pair still lives in light, so amber wins
  //   overall — but the dark comparison is now a tie, not a loss. (#511
  //   de-aliased --color-presence-offline to the literal it rendered at the
  //   time, severing this — offline no longer tracks --color-fg-subtle at
  //   all, so this paragraph is the #506 record, not a live coupling.)
  //
  //   Not a "yellow sits closer to online in hue" story, which is the tempting
  //   explanation and the wrong one: yellow (101°) is nearly midway between
  //   busy (34°) and online (161°), and amber (77°) leans toward busy. What
  //   decides it is that amber's hue gap to ONLINE is the wider of the two (84°
  //   vs yellow's 61°), while busy's much higher chroma (0.193 vs online's
  //   0.116) inflates both busy pairings and leaves online as the binding one.
  //
  // So away stays palette.amber, and the metric moves to OKLab across all six
  // pairs. The old gate would have passed yellow; this one rejects it.
  //
  // Derived, not listed: an allowlist here would silently ignore a fifth status,
  // which is the mistake this file already made three review rounds in a row.
  const DOTS = [...new Set([...TOKENS.matchAll(/--color-presence-([a-z]+):/g)].map((m) => m[1]))];

  it('finds the presence tokens at all', () => {
    // Guards the guard: a rename would make every pair below vacuously pass.
    expect(DOTS.length).toBeGreaterThanOrEqual(4);
  });

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every pair of dots is perceptibly distinct in %s', (_theme, source) => {
    // 0.13 sits under today's tightest pair and above the rejected yellow's
    // 0.118, so the discarded option stays discarded.
    //
    // THE BINDING PAIR MOVED in #506. It was light away/online at 0.153; it is
    // now light online/offline at 0.1344, because re-pointing
    // --color-presence-offline to --color-fg-subtle (to get its own silhouette
    // above 3:1 against the cut — it was 2.26:1) brought it closer to the
    // others. Margin over the floor went 17.8% -> 3.4%. That is a real cost and
    // it was worth paying: the shape channel now carries the separation this
    // gate cannot see, and ΔE here is redundancy rather than the only defence.
    //
    // #511 de-aliased --color-presence-offline to a literal (the exact value
    // it rendered at that moment), so this is no longer a live coupling: a
    // future --color-fg-subtle retune moves nothing here, and offline only
    // moves again if someone edits its own literal directly. That is the
    // single most load-bearing consequence of #511 for THIS gate — it changes
    // nothing numerically below, only what a --color-fg-subtle retuner needs
    // to re-check (nothing, here).
    //
    // Walking --color-success by its own hover delta, online/offline opens up
    // immediately (light 0.1344 -> 0.1604 -> 0.2137; dark 0.1958 -> 0.2381), so
    // the thinner margin is not fragile along the axis the walk below explores.
    // Headroom is about one retune step, and the two themes behave differently
    // enough that quoting one figure for both is how this comment was wrong
    // before. Walking --color-success (which online aliases) by its own hover
    // delta — repeated in sRGB channels, the space a retune is actually authored
    // in; an OKLab-vector walk gives slightly different figures and the same
    // verdict — away/online goes:
    //
    //   light   0.153 -> 0.135 -> 0.157 -> 0.211
    //   dark    0.199 -> 0.144 -> 0.115 -> 0.131
    //
    // Light bottoms out at 0.135 after one step and recovers. DARK KEEPS
    // FALLING, to 0.115 at two steps, THROUGH this floor. An earlier version of
    // this comment called the light walk "the whole risk along this axis" — it
    // is the dark one that actually fires this gate, and the light figures were
    // quoted as if they covered both themes.
    //
    // Neither dip is a hue effect: the amber/online hue gap only widens (light
    // 84.0 -> 84.5 -> 85.3 -> 86.8 deg). It is lightness — light |dL| runs
    // 0.051 -> 0.022 -> 0.098 -> 0.178, crossing near one step and reopening
    // after. Hue was the first explanation written here and it was wrong, the
    // same trap the describe-level note above flags for the amber/yellow
    // choice.
    //
    // When this does fire, revisit `away`, not the floor.
    for (const [i, a] of DOTS.entries()) {
      for (const b of DOTS.slice(i + 1)) {
        const separation = deltaE(
          tokenValue(`--color-presence-${a}`, source),
          tokenValue(`--color-presence-${b}`, source),
        );
        expect(separation, `${a} vs ${b}`).toBeGreaterThan(0.13);
      }
    }
  });
});

describe('the warning regression specifically', () => {
  it('keeps --color-warning itself unusable as a foreground on its own tint', () => {
    // Not a bug in the primitive — #ff991f is correct as a SOLID fill, which is
    // what `--color-warning-fg` pairs with. This asserts the reason the strong
    // variant has to exist, so nobody "simplifies" the components back onto it.
    const ratio = contrast(
      tokenValue('--color-warning', TOKENS),
      tokenValue('--color-warning-bg-subtle', TOKENS),
    );
    expect(ratio).toBeLessThan(3.0);
  });

  it('resolves --color-warning-strong to the same value as --color-warning in dark', () => {
    // Dark already passed at 8.23:1, so the strong variant deliberately does not
    // diverge there. If that ever changes, the dark pairs above must be re-checked.
    expect(tokenValue('--color-warning-strong', DARK)).toBe(tokenValue('--color-warning', DARK));
  });
});

/**
 * #504. Component-level hover steps, which the tone gate above explicitly does
 * not cover and says so.
 *
 * THE THEME-SCOPING RULE, written down here because its absence is why four
 * sweeps of this produced three different totals. A component `-hover` token is
 * IN SCOPE when the token it replaces — the same name minus `-hover` — resolves
 * to an opaque colour in both themes. That is the only case where a step is
 * measurable at all, because it is the only case where the token graph records
 * what the hover replaces.
 *
 * Everything else is excluded, and the exclusion is DERIVED rather than listed:
 * each excluded token has to prove its reason below, so a new one cannot join
 * the excluded set by nobody noticing. The reasons are
 *
 *   absent      — no base token. The hover paints onto whatever surface is
 *                 behind the element (menu items, ghost buttons).
 *   transparent — the base is literally `transparent`. Same situation, stated.
 *   translucent — the base carries alpha, so it composites over a surface the
 *                 token graph does not name (Lightbox controls over its scrim).
 *   noncolour   — the token is not a colour. --slider-thumb-shadow-hover
 *                 resolves to a box-shadow list; a `-hover` suffix does not
 *                 make a token a colour.
 *
 * In all three the step depends on a runtime surface, and any number this gate
 * printed for them would be measuring the wrong pair.
 */
describe('a component hover is a visible step from what it replaces', () => {
  const COMPONENTS_DIR = resolve(__dirname, '../components');

  const componentDirs = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();

  const tokenFiles = componentDirs.flatMap((dir) =>
    readdirSync(resolve(COMPONENTS_DIR, dir))
      .filter((file) => file.endsWith('.tokens.scss'))
      .map((file) => ({
        dir,
        name: file,
        source: stripComments(readFileSync(resolve(COMPONENTS_DIR, dir, file), 'utf8')),
      })),
  );
  // Component tokens resolve through each other as well as through the
  // generated scopes, so the whole set is one more place to look.
  const COMPONENT_SOURCE = tokenFiles.map((file) => file.source).join('\n');

  type Resolved =
    | { kind: 'opaque'; hex: string }
    | { kind: 'translucent' }
    | { kind: 'absent' }
    | { kind: 'transparent' }
    | { kind: 'noncolour'; value: string };

  /**
   * Like tokenValue(), but it CLASSIFIES instead of throwing — the excluded
   * cases are the point here, not an error. Goes through declaredValue() for
   * the same two reasons that helper exists: comments must not satisfy a match,
   * and a name declared twice with different values must refuse to answer
   * rather than report whichever came first.
   */
  function resolveColour(name: string, theme: string, seen: string[] = []): Resolved {
    if (seen.includes(name)) throw new Error(`alias cycle: ${[...seen, name].join(' -> ')}`);
    const declaration =
      declaredValue(name, theme) ??
      declaredValue(name, TOKENS) ??
      declaredValue(name, COMPONENT_SOURCE);
    if (declaration === undefined) return { kind: 'absent' };
    if (declaration === 'transparent') return { kind: 'transparent' };

    const alias = declaration.match(/^var\((--[a-z0-9-]+)\)$/);
    if (alias) return resolveColour(alias[1], theme, [...seen, name]);

    const hex = declaration.match(/^#([0-9a-fA-F]{6})$/);
    if (hex) {
      // The same guard tokenValue() carries, for the same reason: a literal read
      // out of the LIGHT source and reported as dark would pass the dark
      // assertion having checked nothing dark. No live instance today — the
      // component token files declare no opaque literals at all, which the
      // design-tokens suite now asserts separately — but that gate lives in
      // another package and neither references the other, so this stands on its
      // own.
      if (theme !== TOKENS && declaredValue(name, theme) === undefined) {
        throw new Error(
          `${name} is declared only in the light scope. If that is deliberate — a ` +
            `theme-independent value like --color-fg-on-overlay or --ring-on-scrim — ` +
            `read it through TOKENS explicitly rather than per theme.`,
        );
      }
      return { kind: 'opaque', hex: `#${hex[1].toLowerCase()}` };
    }
    // `rgb(r g b / a%)` and friends. Alpha is what matters, not the notation.
    if (/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/.test(declaration)) {
      return declaration.includes('/') || /^rgba\(|^hsla\(/.test(declaration)
        ? { kind: 'translucent' }
        : { kind: 'opaque', hex: rgbToHex(declaration) };
    }
    // color-mix, which Button uses for its selected hover. Resolving it keeps
    // the token IN the gate: the file's stated scoping rule says a hover whose
    // base resolves opaque in both themes is in scope, so classifying this as
    // noncolour would be narrowing the rule to fit the parser rather than the
    // other way round. Only the two-colour srgb form is understood — anything
    // else falls through and is excluded loudly rather than mixed wrongly.
    const mix = declaration.match(
      /^color-mix\(\s*in srgb\s*,\s*([^,]+?)\s*(?:([\d.]+)%)?\s*,\s*([^,]+?)\s*(?:([\d.]+)%)?\s*\)$/,
    );
    if (mix) {
      const [left, right] = [mix[1], mix[3]].map((part) => {
        const alias = part.match(/^var\((--[a-z0-9-]+)\)$/);
        return alias ? resolveColour(alias[1], theme, [...seen, name]) : undefined;
      });
      if (left?.kind === 'opaque' && right?.kind === 'opaque') {
        // All four PERCENTAGE-AFTER-COLOUR forms, per CSS Color 5. (The
        // percentage-BEFORE-colour form is equally legal and falls through to
        // `noncolour` — fail-safe, since the token then shows up in
        // EXCLUDED_HOVERS rather than being mixed wrongly.) The last two forms
        // are the ones that bite: with BOTH given, the percentages are SCALED to
        // sum to 100 rather than taken literally — `A 80%, B 80%` is a 50/50
        // mix, not 80/20 — and if they sum to LESS than 100 the result carries
        // alpha = sum/100, so `A 20%, B 20%` is a translucent 50/50. Reporting
        // that as opaque would be worse than a wrong hex: it would pull a
        // token CSS makes translucent INTO the gate, where every other
        // alpha-carrying base is excluded.
        const [p1, p2] = [mix[2], mix[4]].map((v) => (v === undefined ? undefined : Number(v)));
        // Out-of-range percentages are invalid CSS, and without this the share
        // goes negative or past 1 and the mix produces a NINE-character hex that
        // deltaE and luminance both slice happily and answer a plausible wrong
        // number for. The only path where this resolver is confidently wrong
        // rather than falling through, so it is closed rather than documented.
        if ([p1, p2].some((p) => p !== undefined && (p < 0 || p > 100))) {
          return { kind: 'noncolour', value: declaration };
        }
        if (p1 !== undefined && p2 !== undefined && p1 + p2 < 100) return { kind: 'translucent' };
        const rightShare =
          p1 === undefined && p2 === undefined
            ? 0.5
            : p1 === undefined
              ? p2! / 100
              : p2 === undefined
                ? 1 - p1 / 100
                : p2 / (p1 + p2);
        const channels = [0, 2, 4].map((i) => {
          const a = parseInt(left.hex.slice(1 + i, 3 + i), 16);
          const b = parseInt(right.hex.slice(1 + i, 3 + i), 16);
          return Math.round(a * (1 - rightShare) + b * rightShare);
        });
        return {
          kind: 'opaque',
          hex: `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
        };
      }
    }

    // Not a colour at all — --slider-thumb-shadow-hover resolves to a box-shadow
    // list. A `-hover` suffix does not make a token a colour, and measuring a
    // perceptual step between two shadow lists is meaningless.
    return { kind: 'noncolour', value: declaration };
  }

  function rgbToHex(value: string): string {
    const channels = value.match(/\d+/g)!.slice(0, 3).map(Number);
    return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * The body of every INNERMOST rule block mentioning `needle`.
   *
   * Innermost matters. A brace scan that returns every enclosing block would let
   * a `filter: brightness()` anywhere in an ANCESTOR excuse a dead hover token,
   * which is the opposite of what the exemption below promises — it says "the
   * same rule block". Nesting is how SCSS is written here, so an ancestor match
   * is not a hypothetical.
   */
  function blocksMentioning(source: string, needle: string): string[] {
    const bodies: string[] = [];
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] !== '{') continue;
      let depth = 1;
      let j = i + 1;
      for (; j < source.length && depth > 0; j += 1) {
        if (source[j] === '{') depth += 1;
        else if (source[j] === '}') depth -= 1;
      }
      const body = source.slice(i + 1, j - 1);
      if (!body.includes('{') && body.includes(needle)) bodies.push(body);
    }
    return bodies;
  }

  /**
   * The `filter: brightness()` pattern, endorsed rather than replaced.
   *
   * EntityChip's real hover is a filter and `--entity-chip-bg-hover` measures
   * exactly 0.0000, so any gate reading tokens alone scores it broken on day
   * one. Replacing it would mean a per-colour hover token for each of the 30
   * palette colours the chip can take, and `brightness()` also dims the text and
   * border with the background, which re-pointing a background token does not.
   * So the filter stays, and the gate is taught to read it.
   *
   * The filter has to appear in the SAME rule block that sets the token. A
   * file-wide search for `filter: brightness(` would let an unrelated filter
   * elsewhere in the stylesheet excuse a dead hover token — which is the shape
   * of hole this whole file keeps closing.
   */
  function hoverIsAFilter(dir: string, token: string): boolean {
    let module = '';
    for (const file of readdirSync(resolve(COMPONENTS_DIR, dir))) {
      if (file.endsWith('.module.scss')) {
        module += `\n${stripComments(readFileSync(resolve(COMPONENTS_DIR, dir, file), 'utf8'))}`;
      }
    }
    return blocksMentioning(module, `var(${token})`).some((body) =>
      /filter:[^;]*brightness\(/.test(body),
    );
  }

  // Lookbehind rather than a line anchor, matching the design-tokens sweep.
  // On `:root { --a-hover: …; --b-hover: …; }` the anchored form contributes
  // NOTHING — `:root {` precedes the first declaration, so no match starts a
  // line — rather than contributing only the first, which an earlier version of
  // this comment claimed and the sibling file correctly denies.
  //
  // The lookbehind is belt-and-braces here, not a fix: this regex terminates at
  // `:` and never eats the `;` the next match needs, so `(?:^|[;{])` finds all
  // of them too. That consuming hazard is real only in source.test.mjs, whose
  // pattern runs through the `;`. No live case either way — every *.tokens.scss
  // is one declaration per line — but the two files answer the same question
  // and should not answer it differently.
  const candidates = tokenFiles.flatMap(({ dir, source }) =>
    [...source.matchAll(/(?<=^|[;{])\s*(--[a-z0-9-]+-hover)\s*:/gm)].map((match) => ({
      dir,
      token: match[1],
      base: match[1].replace(/-hover$/, ''),
    })),
  );

  it('finds the component hover tokens at all', () => {
    // Guards the guard: a rename or a moved directory would make every
    // assertion below vacuously pass.
    expect(tokenFiles.length).toBeGreaterThanOrEqual(81);
    expect(candidates.length).toBeGreaterThanOrEqual(60);
  });

  /**
   * The 30 hover tokens that are OUT of the gate, listed rather than counted.
   *
   * 26 are `absent` (no base token at all — the hover paints onto whatever
   * surface is behind the element), 2 are `transparent`, 1 `translucent`, 1
   * `noncolour`. The docblock below used to say each member "has to justify
   * itself"; what actually happens is that the KIND has to be one of the four,
   * enforced at compile time, and the membership has to match this list. No
   * per-token reason is recorded, and claiming otherwise overstated it.
   *
   * Select/--select-chip-remove-fg-hover is the one worth a note: it is a third
   * `-fg-hover` with no base, and unlike OptionsPicker's its base genuinely
   * cannot exist — `.chipRemove` inherits its resting colour (`color: inherit`),
   * so there is nothing to declare. Do not "fix" it into the gate.
   */
  const EXCLUDED_HOVERS = [
    'Accordion/--accordion-trigger-bg-hover',
    'Button/--button-bg-ghost-hover',
    'Calendar/--calendar-agenda-row-bg-hover',
    'Calendar/--calendar-more-chip-bg-hover',
    'Calendar/--calendar-resize-handle-bg-hover',
    'DataTable/--data-table-expand-button-bg-hover',
    'DataTable/--data-table-pinned-bg-row-hover',
    'DatePicker/--date-picker-button-bg-hover',
    'DatePicker/--date-picker-cell-bg-hover',
    'DatePicker/--date-picker-nav-bg-hover',
    'DatePicker/--date-picker-time-now-button-bg-hover',
    'DatePicker/--date-picker-time-toggle-bg-hover',
    'DateRangePicker/--date-range-picker-button-bg-hover',
    'DateRangePicker/--date-range-picker-inline-nav-bg-hover',
    'DateRangePicker/--date-range-picker-popover-nav-bg-hover',
    'DropdownMenu/--dropdown-menu-item-bg-danger-hover',
    'DropdownMenu/--dropdown-menu-item-bg-hover',
    'FilterChip/--filter-chip-dismiss-bg-hover',
    'Lightbox/--lightbox-control-bg-hover',
    'OptionsPicker/--options-picker-row-bg-hover',
    'PageHeader/--page-header-back-button-bg-hover',
    'Rail/--rail-item-bg-hover',
    'Select/--select-chip-remove-bg-hover',
    'Select/--select-chip-remove-fg-hover',
    'Select/--select-clear-bg-hover',
    'Select/--select-retry-bg-hover',
    'Slider/--slider-thumb-shadow-hover',
    'Sortable/--sortable-handle-bg-hover',
    'Table/--table-row-bg-hover',
    'Tabs/--tabs-vertical-tab-bg-hover',
  ];

  it('every excluded hover proves why it is out of scope', () => {
    // The membership is recomputed here and matched against EXCLUDED_HOVERS
    // above; the KIND of each exclusion is enforced by the exhaustiveness check
    // below. An excluded token whose base turns
    // out to resolve to an opaque colour after all is a token that quietly left
    // the gate, and it fails here rather than going unmeasured.
    const unjustified: string[] = [];
    const excluded: string[] = [];
    for (const { dir, token, base } of candidates) {
      const light = resolveColour(base, TOKENS);
      const dark = resolveColour(base, DARK);
      if (light.kind === 'opaque' && dark.kind === 'opaque') continue;
      excluded.push(`${dir}/${token}`);
      if (light.kind === 'opaque' || dark.kind === 'opaque') {
        unjustified.push(`${dir}/${token}: base differs by theme (${light.kind} / ${dark.kind})`);
        continue;
      }
      // Each excluded base has to land on one of the four reasons. This is a
      // TYPE-level check, not a runtime one, and deliberately so: after the two
      // `opaque` branches above, the Resolved union leaves exactly these four,
      // so a runtime `allowed.includes(...)` could never fire and would be a
      // dead assertion wearing a docblock. Adding a fifth kind to Resolved
      // without deciding whether it justifies exclusion fails the build here
      // instead — which is the check that was actually wanted.
      for (const resolved of [light, dark]) {
        switch (resolved.kind) {
          case 'absent':
          case 'transparent':
          case 'translucent':
          case 'noncolour':
            break;
          default: {
            // Binding to `never` is what makes this a compile-time check: it
            // type-errors the moment Resolved gains a kind the four cases above
            // do not handle.
            const unhandled: never = resolved;
            unjustified.push(`${dir}/${token}: base is ${JSON.stringify(unhandled)}`);
          }
        }
      }
    }
    expect(unjustified).toEqual([]);

    // PIN THE EXCLUDED COUNT, not just the measured one. `measured >= 40`
    // catches a LOSS; it cannot catch a failure to ADD. Nothing forces a
    // `-hover` token to have a base, so shipping `--x-fg-hover` with no `--x-fg`
    // leaves this gate silently — `absent` is an accepted reason and the
    // measured floor does not move. That is exactly how
    // --options-picker-group-header-hint-fg-hover went unmeasured until a
    // reviewer noticed. With the count pinned, a new unmeasured hover fails here
    // until someone either declares its base or comes back and says why it has
    // none.
    // NAMED, not counted — the same reasoning the measurement test states two
    // assertions later and this one did not follow. A bare count is swap-blind:
    // declaring a base for one token while adding a brand-new orphan hover
    // leaves it at 30, and `measured >= 41` does not notice either because
    // measured went up. The list makes both halves of that swap visible.
    expect(excluded.sort(), 'the excluded set changed').toEqual(EXCLUDED_HOVERS);
  });

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every measurable component hover clears the floor in %s', (_theme, source) => {
    // 0.04 sits under the tightest measurable step the library now has (0.0453
    // in both themes — the muted-surface hovers in light, Switch's track hover
    // in dark) and above every value this change replaced:
    // --button-bg-secondary-hover at 0.0125 on the second-most-used button,
    // --options-picker-group-header-bg-hover at 0.0177 AND moving the wrong way
    // in light, and the 0.0266-0.0302 cluster. So the state being fixed cannot
    // come back, which is the same shape as the presence gate's floor sitting
    // above the rejected yellow.
    //
    // It is deliberately NOT the tone gate's 0.065. That floor is anchored to
    // saturated fills, where a step of the same size reads much more strongly
    // than it does between two near-white neutrals. The light neutral surface
    // scale is compressed enough that 0.065 is not reachable from a muted base
    // without inventing a surface darker than --color-bg-sunken; 0.04 is what
    // the scale supports with headroom, and that limit is a property of the
    // scale rather than of this gate.
    //
    // Anchored to what the library manages AFTER a deliberate raise, which is
    // the one case #484's anchoring rule permits: that rule exists to stop a
    // gate being calibrated to accept a regression it was written to catch, and
    // every number here moved up.
    const failures: string[] = [];
    let measured = 0;
    const droppedAtTheHover: string[] = [];
    for (const { dir, token, base } of candidates) {
      const from = resolveColour(base, source);
      const to = resolveColour(token, source);
      // The scoping rule keys on the BASE, so a token whose base is opaque is in
      // scope by that rule and has to be measured. If its HOVER will not resolve,
      // it silently leaves through a door neither floor watches — which is what
      // --button-bg-selected-hover did: a four-line color-mix that declaredValue
      // could not read, so the pair was neither measured nor asked to justify
      // itself, and both counts stayed put.
      if (from.kind === 'opaque' && to.kind !== 'opaque') {
        droppedAtTheHover.push(`${dir}/${token}: base opaque, hover ${to.kind}`);
        continue;
      }
      if (from.kind !== 'opaque' || to.kind !== 'opaque') continue;
      measured += 1;

      if (hoverIsAFilter(dir, token)) {
        // Endorsed, but not unchecked. A filter hover means the TOKEN is doing
        // nothing, so it must equal its base — if it carries a value, the
        // component is painting a step and dimming it as well, and whichever
        // one was intended, one of them is unintentional.
        // Not a rule invented for this gate. EntityChip's own colorStyle()
        // injects `--entity-chip-bg-hover` pointing at the SAME palette
        // background as `--entity-chip-bg`, with the comment "so the hover
        // brightness filter works on any palette color" — so the equality
        // asserted here is the contract the component already runs on, and
        // asserting it statically is what keeps the two from drifting apart.
        if (from.hex !== to.hex) {
          failures.push(
            `${dir}/${token}: filter hover, but the token also moves ${from.hex} -> ${to.hex}`,
          );
        }
        continue;
      }

      const step = deltaE(from.hex, to.hex);
      if (step < 0.04) failures.push(`${dir}/${token}: ${step.toFixed(4)}`);

      // Magnitude alone would pass a hover that moved the WRONG way, which is
      // exactly what --options-picker-group-header-bg-hover did: it LIGHTENED a
      // muted surface in light theme. Direction is theme-dependent — light
      // hovers darken, dark hovers lighten.
      //
      // SURFACES ONLY. The first version of this applied the rule to every
      // token and failed --link-fg-subtle-hover, correctly measured and not a
      // bug: subtle link text hovers from near-black to the accent blue, which
      // LIGHTENS in light theme, and muted link text does the same in dark.
      // A foreground hover moves toward a tone, not along a lightness ramp, so
      // it has no correct direction to assert; the floor above already requires
      // it to move perceptibly. `-bg` is the marker, taken from the name rather
      // than a list of tokens.
      if (!token.includes('-bg')) continue;
      const moved = luminance(to.hex) - luminance(from.hex);
      const expected = _theme === 'dark' ? 1 : -1;
      if (Math.sign(moved) !== expected) {
        failures.push(`${dir}/${token}: moves the wrong way (${from.hex} -> ${to.hex})`);
      }
    }
    expect(failures).toEqual([]);
    // Named, not counted. A count would let one token leave as another arrives.
    expect(droppedAtTheHover, 'in scope by the base rule, but unmeasurable').toEqual([]);
    // THE GATE'S OWN GUARD, and the reason it is a count rather than a boolean.
    // Every assertion above is inside `if (kind === 'opaque')`, so anything that
    // stops resolveColour resolving — a refactor of declaredValue, a moved
    // generated file, a renamed token — makes this whole block iterate over
    // nothing and pass. Verified: hard-wiring resolveColour to return `absent`
    // left every test in this file green.
    //
    // 41 is what the library measures today — instrumented, not estimated. It
    // has been wrong three times: 37 when it was 39, 39 when the same commit
    // made it 40, and 40 until color-mix resolution brought a 41st back in.
    // A floor below the real number cannot see a partial loss, which is the
    // whole job here. Deliberately not `> 0`, because losing 30 of 40 is the
    // same class of failure as losing all 41. Re-instrument when it changes;
    // guessing the delta is how it went stale both times.
    expect(measured, 'the gate measured nothing — resolveColour is broken').toBeGreaterThanOrEqual(
      41,
    );
  });
});
