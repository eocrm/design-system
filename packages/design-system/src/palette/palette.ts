/**
 * Categorical color palette. 30 named colors with bg + fg pairs.
 * Use for consumer-defined domain → color mappings (audit event
 * namespaces, tag/label picker, team-colored checkboxes, …).
 *
 * NOT semantic — use `BadgeTone` (info/success/warning/danger/…)
 * for status. Palette colors carry no meaning beyond visual identity.
 *
 * The generated `@eocrm/design-tokens` Sass contract exposes the
 * `--color-palette-<name>-bg/--color-palette-<name>-fg` namespace.
 * Contributors change source definitions in
 * `packages/design-tokens/src/tokens.json`.
 */
export type PaletteColor =
  | 'red'
  | 'coral'
  | 'orange'
  | 'amber'
  | 'gold'
  | 'yellow'
  | 'olive'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'navy'
  | 'indigo'
  | 'violet'
  | 'lavender'
  | 'purple'
  | 'plum'
  | 'fuchsia'
  | 'magenta'
  | 'pink'
  | 'rose'
  | 'brown'
  | 'taupe'
  | 'slate'
  | 'stone'
  | 'charcoal';

/**
 * Ordered list of all 30 palette colors. Use for demo grids, color
 * pickers, or anywhere a stable iteration order is needed.
 */
export const PALETTE_COLORS = [
  'red',
  'coral',
  'orange',
  'amber',
  'gold',
  'yellow',
  'olive',
  'lime',
  'green',
  'emerald',
  'mint',
  'teal',
  'cyan',
  'sky',
  'blue',
  'navy',
  'indigo',
  'violet',
  'lavender',
  'purple',
  'plum',
  'fuchsia',
  'magenta',
  'pink',
  'rose',
  'brown',
  'taupe',
  'slate',
  'stone',
  'charcoal',
] as const satisfies readonly PaletteColor[];

/**
 * Returns the CSS custom-property names for a palette color's bg and fg.
 * Use to apply palette colors to consumer-built components without
 * hard-coding the var names.
 *
 * @example
 * const { bg, fg } = paletteTokens('amber');
 * // bg === 'var(--color-palette-amber-bg)'
 * // fg === 'var(--color-palette-amber-fg)'
 *
 * @example
 * // In a consumer-built chip:
 * function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
 *   const { bg, fg } = paletteTokens(color);
 *   return <span style={{ background: bg, color: fg }}>{children}</span>;
 * }
 */
export function paletteTokens(color: PaletteColor): { bg: string; fg: string } {
  return {
    bg: `var(--color-palette-${color}-bg)`,
    fg: `var(--color-palette-${color}-fg)`,
  };
}
