import { type PaletteColor } from '../../palette';

/**
 * Workflow status category — maps to a default palette color. Shared by
 * `StatusMenu` and `EntityChip` so both resolve the same category → color
 * mapping.
 */
export type StatusCategory = 'to_do' | 'in_progress' | 'open' | 'done' | 'won' | 'lost';

/** Category → default palette color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
export const STATUS_CATEGORY_COLOR: Record<StatusCategory, PaletteColor> = {
  to_do: 'slate',
  in_progress: 'blue',
  open: 'violet',
  done: 'green',
  won: 'green',
  lost: 'red',
};

/** `color` wins; otherwise fall back to the category's default; otherwise slate. */
export function resolveStatusColor(status: {
  category?: StatusCategory;
  color?: PaletteColor;
}): PaletteColor {
  return status.color ?? (status.category && STATUS_CATEGORY_COLOR[status.category]) ?? 'slate';
}
