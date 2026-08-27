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
      throw new Error(`${name} is a light-only literal; it cannot answer for another theme`);
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
  // DropdownMenu's danger item hover, Select and LiquidEditor;
  // --color-accent-subtle-bg is painted by Rail, Tabs, Select's selected option
  // and Screen (a page gradient there, not text). Six files across the two
  // tints. Retuning a gated twin would leave its duplicate at the stale tint
  // with all of them still rendering on it.
  ['danger text on the duplicate danger tint', '--color-danger', '--color-bg-danger-subtle', 4.5],
  ['accent text on the duplicate accent tint', '--color-accent', '--color-accent-subtle-bg', 4.5],
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
      const declared = source.match(new RegExp(`(?:^|[^-a-z0-9])${token}:\\s*([^;\n]+);`))?.[1];
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
    // FILL also cleared the bar but read as chocolate brown, and pairing the fg
    // with --color-warning-strong measures 2.37:1 while looking plausible.
    const scss = readFileSync(
      resolve(__dirname, '../components/Calendar/Calendar.tokens.scss'),
      'utf8',
    );
    expect(scss).toMatch(/--calendar-event-chip-all-day-bg-warning:\s*var\(--color-warning\);/);
    expect(scss).toMatch(/--calendar-event-chip-all-day-fg-warning:\s*var\(--color-warning-fg\);/);
  });
});

describe('rules without a token name are pinned too', () => {
  it('Dot paints its warning tone with the strong variant', () => {
    // Dot sets `background:` directly inside `&[data-tone='warning']`, so there
    // is no custom property for SLOTS to assert. It was the headline fix of the
    // sweep and had no gate at all until this.
    const scss = readFileSync(resolve(__dirname, '../components/Dot/Dot.module.scss'), 'utf8');
    const rule = scss.match(/\[data-tone='warning'\]\s*\{[^}]*\}/)?.[0];
    expect(rule, "Dot's warning tone rule").toBeDefined();
    expect(rule).toMatch(/var\(--color-warning-strong\)/);
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
    // The floor is 0.065, anchored to the SMALLEST step the library had before
    // #484 touched it (light accent, 0.0662). That anchor is deliberate: the
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
    // This covers three primitives, not the library. Seven component-level
    // hover pairs in light are below this floor (11 theme-instances across 8
    // distinct pairs once dark is counted), --entity-chip-bg-hover at exactly
    // 0.0000, all deliberately out of scope — see #490.
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
  ])('every --ring-* still matches the tone it was derived from in %s', (_theme, source) => {
    // The rings are hand-written rgb() literals, so nothing links them to their
    // primitive. Three were byte-exact decompositions of values this branch
    // changed, leaving an invalid Input drawing its border in one red and its
    // ring, 2px away and concentric, in another.
    //
    // This pins RGB to the primitive exactly, which is also what forces the
    // light-accent exemption below. If ring ALPHA is ever revisited (--ring-danger
    // at 40% composites to 1.94:1 on white, under 1.4.11's 3:1 for a focus
    // indicator — see #490), this gate is the thing to renegotiate first.
    for (const tone of ['accent', 'danger', 'success'] as const) {
      const declared = [...source.matchAll(new RegExp(`--ring-${tone}:\\s*([^;\n]+);`, 'g'))].map(
        (m) => m[1],
      );
      // dark.scss declares every ring twice — once under [data-theme='dark'],
      // once under prefers-color-scheme. Reading only the first let the second
      // copy be mutated freely.
      expect(new Set(declared).size, `--ring-${tone} declarations agree`).toBeLessThanOrEqual(1);
      // Only the rings need this. tokenValue() also reads the first declaration
      // of the two dark.scss copies, but that is covered from the other side:
      // tokens:check diffs both forcedDark and systemDark against tokens.json
      // and fails on a single hex digit. The rings need it here because their
      // values are hand-written literals with no source of truth to diff.
      const ring = declared[0];
      // No fallback to the light source. All three are declared in both files;
      // if one is ever dropped, failing here is better than silently comparing
      // a light triple against a dark tone.
      expect(ring, `--ring-${tone} is declared in ${_theme}`).toBeDefined();
      // The reconstruction below only understands integer rgb(). An equivalent
      // percentage form is the same COLOUR but reconstructs to garbage, so say
      // so plainly rather than reporting a baffling colour mismatch.
      expect(ring!.split('/')[0], `--ring-${tone} uses integer rgb()`).toMatch(
        /^rgba?\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}\s*$/,
      );
      const channels = ring!.match(/\d+/g)!.slice(0, 3).map(Number);
      const asHex = `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      if (_theme === 'light' && tone === 'accent') {
        // The one deliberate divergence: a lighter blue, so a focus ring reads
        // against the accent fill it surrounds. Pinned rather than exempted —
        // an unguarded exemption is the same hole this block was written to
        // close, and every focus ring in the library resolves through it.
        expect(ring, 'light --ring-accent is deliberately not --color-accent').toBe(
          'rgb(76 154 255 / 50%)',
        );
        // Pinned at BOTH ends. Pinning only the ring left the direction that
        // actually broke on this branch — the primitive moving out from under a
        // hand-written ring — silent for the one tone every focus ring in the
        // library resolves through.
        expect(tokenValue('--color-accent', source), 'retuning accent must revisit its ring').toBe(
          '#0052cc',
        );
        continue;
      }
      expect(asHex, `--ring-${tone} vs --color-${tone}`).toBe(
        tokenValue(`--color-${tone}`, source),
      );
    }
  });
});

describe('presence dots stay distinguishable from each other', () => {
  // Every dot is aria-hidden with no text alternative (Avatar.tsx), and status
  // never reaches the accessible name or the tooltip — colour is the entire
  // channel. What this measures is NORMAL TRICHROMATIC separation; it is not a
  // WCAG 1.4.1 conformance claim and cannot be one, because OKLab ΔE is blind
  // to dichromacy. Under simulated protanopia light amber/busy collapses by an
  // order of magnitude — 0.018 by Brettel 1997, 0.015 by Vienot 1999 — while
  // this gate reads 0.158 and passes. (Machado 2009 at full severity gives
  // 0.076: still a collapse, but the three methods disagree enough that only
  // the direction is worth quoting.)
  //
  // No AMBER-OR-YELLOW candidate escapes that, and `away` has to read as
  // yellow, so within the constraint the palette is not the lever — the remedy
  // is a second channel (text alternative or dot shape), tracked in #490. Worth
  // being precise rather than sweeping, though: several unconstrained palette
  // entries (blue, indigo, navy, charcoal) hold the worst pair at 0.129 under
  // the same simulation. And busy/online is itself 0.129 there, under this
  // block's own floor, which is the stronger argument for #490.
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
  //   next person will re-derive it: in dark, yellow is actually the better of
  //   the two (worst pair 0.215 vs amber's 0.199). The global worst pair lives
  //   in light, so amber wins overall — but only there.
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
    // 0.13 sits under today's tightest pair (light away/online, 0.153) and above
    // the rejected yellow's 0.118, so the discarded option stays discarded.
    // Headroom is roughly ONE retune step, not a comfortable margin: darkening
    // --color-success (which online aliases) by its own hover delta lands
    // away/online at 0.1348 — still over, but by 0.0048.
    //
    // That is the WHOLE risk along this axis, not the first step of a slide:
    // the relation is non-monotonic. Darkening success further sends it back up
    // (0.157 at two steps, 0.211 at three) because online passes closest to
    // amber in hue on the way past. So 0.1348 is about the worst this floor
    // ever sees from a success retune, and it survives it. If it does fire, the
    // answer is to revisit `away`, not this number.
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
