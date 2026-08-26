import { readFileSync } from 'node:fs';
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

function tokenValue(name: string, source: string): string {
  const match = source.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`${name} is not a literal colour in the generated output`);
  return match[1];
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
 * the rest of the UI rests on. The other semantic tones are deliberately NOT
 * here: two of them sit just under AA and live in `BELOW_AA_TEXT` below, and
 * `info` passes comfortably in both themes.
 */
const PAIRS: Pair[] = [
  // The regression: warning as a foreground on its own subtle tint.
  ['warning fg on warning tint', '--color-warning-strong', '--color-warning-bg-subtle', 4.5],
  ['warning graphic on page bg', '--color-warning-strong', '--color-bg', 3.0],
  // The all-day chip inverts it — solid fill, light text — so the FILL is what
  // had to darken.
  ['warning-fg text on solid warning fill', '--color-warning-fg', '--color-warning-strong', 4.5],
  ['body text on page bg', '--color-fg', '--color-bg', 4.5],
  ['muted text on page bg', '--color-fg-muted', '--color-bg', 4.5],
];

/**
 * Pairs that do NOT clear AA for text today, pinned at their current value so
 * they cannot quietly get worse. These are pre-existing and were surfaced by
 * this test, not introduced by it — see #484. They are all near-misses used as
 * both text and iconography; every one clears 1.4.11's 3:1 graphical bar, so
 * the exposure is text usage specifically. Raising them means retuning three
 * semantic primitives, which is a design decision rather than a bug fix.
 *
 * If you improve one, tighten its number here. If a change pushes one DOWN,
 * this fails — which is the point.
 */
const BELOW_AA_TEXT: Pair[] = [
  ['danger fg on danger tint (light)', '--color-danger', '--color-danger-bg-subtle', 3.95],
  ['success fg on success tint (light)', '--color-success', '--color-success-bg-subtle', 4.2],
];

describe.each([
  ['light', TOKENS],
  ['dark', DARK],
])('shipped colour pairs clear WCAG in %s theme', (_theme, source) => {
  it.each(PAIRS)('%s', (_label, fgName, bgName, minimum) => {
    // No light-value fallback, on purpose. Every token in PAIRS is overridden in
    // dark today, so a fallback is dead code — and if one ever stopped being
    // overridden, falling back would compare two LIGHT values and report the
    // dark theme green having checked nothing. Let tokenValue throw instead.
    expect(contrast(tokenValue(fgName, source), tokenValue(bgName, source))).toBeGreaterThanOrEqual(
      minimum,
    );
  });
});

describe('known sub-AA pairs are pinned so they cannot get worse (#484)', () => {
  it.each(BELOW_AA_TEXT)('%s', (_label, fgName, bgName, floor) => {
    expect(contrast(tokenValue(fgName, TOKENS), tokenValue(bgName, TOKENS))).toBeGreaterThanOrEqual(
      floor,
    );
  });

  it('accent on its tint in DARK is the third, at 4.22', () => {
    const read = (n: string) => {
      try {
        return tokenValue(n, DARK);
      } catch {
        return tokenValue(n, TOKENS);
      }
    };
    expect(
      contrast(read('--color-accent'), read('--color-accent-bg-subtle')),
    ).toBeGreaterThanOrEqual(4.22);
  });
});

/**
 * The contrast assertions above check the PRIMITIVES. They do not notice a
 * component pointing its own slot back at `--color-warning`, which is how the
 * bug got in — so pin the slots too.
 *
 * Three of these were ALREADY covered elsewhere and are listed only so the set
 * reads as complete: `--calendar-event-stripe-warning` is asserted by
 * `Calendar/eventColor.test.tsx`, and the two `--badge-stripe-*` values are
 * pinned by the design-tokens contract fixture. Every OTHER slot below had no
 * gate at all — reverting one left the whole suite green, which is how this bug
 * got in and stayed in.
 */
describe('components keep their warning slots on the strong variant', () => {
  const SLOTS: [file: string, tokens: string[]][] = [
    [
      '../components/Calendar/Calendar.tokens.scss',
      [
        '--calendar-event-chip-fg-warning',
        '--calendar-event-chip-all-day-bg-warning',
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
    ['../components/TopBar/TopBar.tokens.scss', ['--topbar-indicator-bg-warning']],
    ['../components/PasswordInput/PasswordInput.tokens.scss', ['--password-input-warning-icon-fg']],
    ['../components/LiquidEditor/LiquidEditor.tokens.scss', ['--liquid-editor-token-number']],
    [
      '../components/PasswordStrengthMeter/PasswordStrengthMeter.tokens.scss',
      ['--password-strength-meter-label-fg-score-2', '--password-strength-meter-label-fg-score-3'],
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
