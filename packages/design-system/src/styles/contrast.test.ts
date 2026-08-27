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
 * `--color-presence-away -> --color-warning`, so a check that only understood
 * literals could not see it — and a grep for `var(--color-warning)` in
 * component source could not either. That blind spot is how it survived the
 * first sweep of this very bug.
 */
function tokenValue(name: string, source: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`alias cycle: ${[...seen, name].join(' -> ')}`);
  // Anchored on a boundary so `--foo` cannot match inside `--bar--foo:`. No
  // escaping: every name is a literal `--[a-z0-9-]+` from the lists below, and
  // a half-working escape would be worse than none.
  const pattern = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;]+);`, 'm');
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
  // Reached through an alias (--color-presence-away -> --color-palette-yellow-fg),
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
      const declared = source.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1];
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
 * Two invariants that were invisible to this whole suite until a retune broke
 * both of them at once. Neither is about contrast — they are about a token
 * having MORE ROLES than the one being measured, which is the failure this file
 * exists to catch and twice did not.
 */
describe('a tone stays in sync with the roles derived from it', () => {
  /** Perceptual distance in OKLab — the right space for "can a person see this". */
  function deltaE(a: string, b: string): number {
    const lab = (hex: string) => {
      const [r, g, b2] = [0, 2, 4]
        .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b2);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b2);
      const s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b2);
      return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2,
      ];
    };
    const [x, y] = [lab(a), lab(b)];
    return Math.hypot(...x.map((v, i) => v - y[i]));
  }

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('every -hover is perceptibly different from its base in %s', (_theme, source) => {
    // Darkening --color-danger collapsed its hover step to 0.025 — a third of
    // what it was, on the DESTRUCTIVE button, where the affordance matters most.
    // Ordering still held, which is why "ordering is unchanged" was the wrong
    // thing to check. Every variant in the library sits in 0.058-0.102.
    for (const tone of ['accent', 'danger', 'success'] as const) {
      const base = tokenValue(`--color-${tone}`, source);
      const hover = tokenValue(`--color-${tone}-hover`, source);
      expect(deltaE(base, hover), `${tone} hover step`).toBeGreaterThanOrEqual(0.04);
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
    const EXEMPT = new Set(['light:accent']); // deliberately a lighter blue
    for (const tone of ['accent', 'danger', 'success'] as const) {
      if (EXEMPT.has(`${_theme}:${tone}`)) continue;
      const ring = (source.match(new RegExp(`--ring-${tone}:\\s*([^;]+);`)) ??
        TOKENS.match(new RegExp(`--ring-${tone}:\\s*([^;]+);`)))?.[1];
      expect(ring, `--ring-${tone} is declared`).toBeDefined();
      const channels = ring!.match(/\d+/g)!.slice(0, 3).map(Number);
      const asHex = `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      expect(asHex, `--ring-${tone} vs --color-${tone}`).toBe(
        tokenValue(`--color-${tone}`, source),
      );
    }
  });
});

describe('presence dots stay distinguishable from each other', () => {
  // away is aria-hidden with no text alternative, so hue is the entire signal.
  // PAIRS already gates its luminance against the page; this gates the thing
  // that actually motivated the alias, twice. --color-warning-strong held
  // contrast while collapsing away/busy 107 -> 61, so #481 moved away to
  // palette.amber (105). Then #484 darkened --color-danger, which
  // --color-presence-busy aliases, and amber fell to 86.1 — under this floor,
  // from a change two files away that never mentioned presence. palette.yellow
  // restores it to 104.7 light / 239.9 dark. It costs separation against ONLINE
  // in light (154.2 -> 139.5) and gains it in dark; busy is the binding
  // constraint, so that is the trade taken.
  function distance(a: string, b: string): number {
    const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
    const [x, y] = [channels(a), channels(b)];
    return Math.hypot(...x.map((v, i) => v - y[i]));
  }

  it.each([
    ['light', TOKENS],
    ['dark', DARK],
  ])('away is well separated from busy in %s', (_theme, source) => {
    const away = tokenValue('--color-presence-away', source);
    const busy = tokenValue('--color-presence-busy', source);
    expect(distance(away, busy)).toBeGreaterThan(90);
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
