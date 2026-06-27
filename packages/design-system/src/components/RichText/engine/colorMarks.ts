// colorMarks.ts — token-backed palette for textColor/bgColor marks. Marks store a
// KEY (a PaletteColor, e.g. 'red'); these resolve it to the design system's full
// categorical palette CSS custom properties so colors stay theme-able/tokens-only.
// Shared by the renderer, serializers, and UI.
import { PALETTE_COLORS, paletteTokens, type PaletteColor } from '../../../palette';

/** A palette key stored by `textColor`/`bgColor` marks — the DS's full 30-color categorical palette. */
export type ColorKey = PaletteColor;
/** Every palette key, in swatch-display order. */
export const COLOR_KEYS: readonly ColorKey[] = PALETTE_COLORS;

/** Type guard: is `s` one of the palette keys? */
export function isColorKey(s: string): s is ColorKey {
  return (PALETTE_COLORS as readonly string[]).includes(s);
}
/** Resolve a text-color key to its palette fg `var(--…)`, or undefined if unknown. */
export function textColorVar(key: string): string | undefined {
  return isColorKey(key) ? paletteTokens(key).fg : undefined;
}
/** Resolve a highlight key to its palette bg `var(--…)`, or undefined if unknown. */
export function bgColorVar(key: string): string | undefined {
  return isColorKey(key) ? paletteTokens(key).bg : undefined;
}
// Parse a CSS value back to a palette key — recognizes our own var() output
// (`var(--color-palette-<key>-fg|bg)`) or the bare token. Raw hex / unknown → undefined
// (the 30 palette hexes aren't mirrored here; the round-trip is via our var() output).
function keyFromVar(css: string, suffix: 'fg' | 'bg'): ColorKey | undefined {
  const c = css
    .trim()
    .toLowerCase()
    .replace(/^var\(\s*/, '')
    .replace(/\s*\)\s*$/, '');
  const m = c.match(/^--color-palette-([a-z]+)-(fg|bg)$/);
  if (!m || m[2] !== suffix) return undefined;
  return isColorKey(m[1]) ? (m[1] as ColorKey) : undefined;
}
/** Parse a CSS `color` value (our var() output) back to a text key, or undefined. */
export function textColorKeyFrom(css: string): ColorKey | undefined {
  return keyFromVar(css, 'fg');
}
/** Parse a CSS `background-color` value (our var() output) back to a bg key, or undefined. */
export function bgColorKeyFrom(css: string): ColorKey | undefined {
  return keyFromVar(css, 'bg');
}
