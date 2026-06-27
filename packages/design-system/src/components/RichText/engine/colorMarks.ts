// colorMarks.ts — the curated, token-backed palette for textColor/bgColor marks.
// Marks store a KEY (e.g. 'red'); these resolve a key to a CSS custom property so
// colors stay theme-able and tokens-only. Shared by the renderer, serializers, and UI.
export type ColorKey = 'gray' | 'red' | 'green' | 'amber' | 'blue';
export const COLOR_KEYS: ColorKey[] = ['gray', 'red', 'green', 'amber', 'blue'];

const TEXT_VAR: Record<ColorKey, string> = {
  gray: '--color-fg-muted',
  red: '--color-danger',
  green: '--color-success',
  amber: '--color-warning',
  blue: '--color-accent',
};
const BG_VAR: Record<ColorKey, string> = {
  gray: '--color-bg-muted',
  red: '--color-danger-bg-subtle',
  green: '--color-success-bg-subtle',
  amber: '--color-warning-bg-subtle',
  blue: '--color-accent-bg-subtle',
};
// Default-theme hex values of the tokens above — a best-effort aid for importing
// HTML that used literal hex rather than our var() output. Keep in sync with
// styles/tokens.scss if those tokens change.
const TEXT_HEX: Record<ColorKey, string> = {
  gray: '#5e6c84',
  red: '#de350b',
  green: '#00875a',
  amber: '#ff991f',
  blue: '#0052cc',
};
const BG_HEX: Record<ColorKey, string> = {
  gray: '#f4f5f7',
  red: '#ffebe6',
  green: '#e3fcef',
  amber: '#fff7ed',
  blue: '#deebff',
};

export function isColorKey(s: string): s is ColorKey {
  return (COLOR_KEYS as string[]).includes(s);
}
export function textColorVar(key: string): string | undefined {
  return isColorKey(key) ? `var(${TEXT_VAR[key]})` : undefined;
}
export function bgColorVar(key: string): string | undefined {
  return isColorKey(key) ? `var(${BG_VAR[key]})` : undefined;
}

function keyFrom(
  css: string,
  vars: Record<ColorKey, string>,
  hexes: Record<ColorKey, string>,
): ColorKey | undefined {
  const c = css.trim().toLowerCase();
  for (const k of COLOR_KEYS) {
    if (c === `var(${vars[k]})` || c === vars[k]) return k; // our var() output (or bare token)
    if (c === hexes[k].toLowerCase()) return k; // default-theme hex
  }
  return undefined;
}
export function textColorKeyFrom(css: string): ColorKey | undefined {
  return keyFrom(css, TEXT_VAR, TEXT_HEX);
}
export function bgColorKeyFrom(css: string): ColorKey | undefined {
  return keyFrom(css, BG_VAR, BG_HEX);
}
