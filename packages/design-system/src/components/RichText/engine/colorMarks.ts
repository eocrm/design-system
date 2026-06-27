// colorMarks.ts — token-backed palette for textColor/bgColor marks. Marks store a
// KEY (e.g. 'red'); these resolve it to a CSS custom property so colors stay
// theme-able/tokens-only. Shared by the renderer, serializers, and UI.
//
// The picker offers the DEFAULT brand colors first (gray + the semantic red/green/
// amber/blue), then the rest of the design system's categorical palette. The four
// palette hues that duplicate a default (red/green/amber/blue) are omitted so there
// is a single canonical red, etc.
import { PALETTE_COLORS, paletteTokens, type PaletteColor } from '../../../palette';

const DEFAULT_KEYS = ['gray', 'red', 'green', 'amber', 'blue'] as const;
type DefaultKey = (typeof DEFAULT_KEYS)[number];
const DEFAULT_TEXT_VAR: Record<DefaultKey, string> = {
  gray: '--color-fg-muted',
  red: '--color-danger',
  green: '--color-success',
  amber: '--color-warning',
  blue: '--color-accent',
};
const DEFAULT_BG_VAR: Record<DefaultKey, string> = {
  gray: '--color-bg-muted',
  red: '--color-danger-bg-subtle',
  green: '--color-success-bg-subtle',
  amber: '--color-warning-bg-subtle',
  blue: '--color-accent-bg-subtle',
};
const DEFAULT_OVERLAP = new Set<string>(['red', 'green', 'amber', 'blue']);
const PALETTE_EXTRA = PALETTE_COLORS.filter((c) => !DEFAULT_OVERLAP.has(c));

/** A palette key stored by `textColor`/`bgColor` marks (never a raw color). */
export type ColorKey = DefaultKey | PaletteColor;
/** Every offered key, in swatch-display order: the default colors first, then the palette. */
export const COLOR_KEYS: readonly ColorKey[] = [...DEFAULT_KEYS, ...PALETTE_EXTRA];

function isDefaultKey(s: string): s is DefaultKey {
  return (DEFAULT_KEYS as readonly string[]).includes(s);
}
/** Type guard: is `s` one of the offered keys? */
export function isColorKey(s: string): s is ColorKey {
  return (COLOR_KEYS as readonly string[]).includes(s);
}
/** Resolve a text-color key to its token-backed `var(--…)`, or undefined if unknown. */
export function textColorVar(key: string): string | undefined {
  if (isDefaultKey(key)) return `var(${DEFAULT_TEXT_VAR[key]})`;
  return isColorKey(key) ? paletteTokens(key as PaletteColor).fg : undefined;
}
/** Resolve a highlight (bg) key to its token-backed `var(--…)`, or undefined if unknown. */
export function bgColorVar(key: string): string | undefined {
  if (isDefaultKey(key)) return `var(${DEFAULT_BG_VAR[key]})`;
  return isColorKey(key) ? paletteTokens(key as PaletteColor).bg : undefined;
}

// Parse a CSS value back to a key — recognizes our own var() output: the default
// semantic tokens and the palette tokens (var(--color-palette-<key>-fg|bg)). A bare
// token (no var()) also parses. Raw hex / unknown → undefined.
function keyFromVar(css: string, suffix: 'fg' | 'bg'): ColorKey | undefined {
  const c = css
    .trim()
    .toLowerCase()
    .replace(/^var\(\s*/, '')
    .replace(/\s*\)\s*$/, '');
  for (const k of DEFAULT_KEYS) {
    if (c === (suffix === 'fg' ? DEFAULT_TEXT_VAR[k] : DEFAULT_BG_VAR[k])) return k;
  }
  const m = c.match(/^--color-palette-([a-z]+)-(fg|bg)$/);
  if (m && m[2] === suffix && isColorKey(m[1]) && !isDefaultKey(m[1])) return m[1] as ColorKey;
  return undefined;
}
/** Parse a CSS `color` value back to a text key (our var() output), or undefined. */
export function textColorKeyFrom(css: string): ColorKey | undefined {
  return keyFromVar(css, 'fg');
}
/** Parse a CSS `background-color` value back to a bg key (our var() output), or undefined. */
export function bgColorKeyFrom(css: string): ColorKey | undefined {
  return keyFromVar(css, 'bg');
}
