/**
 * Column-span vocabulary shared by `Grid.Item` and `Sortable.Item` (grid
 * arrangement). Lives in `_internal` so both components reference one source of
 * the fraction→track mapping without either importing the other (which would
 * imply a render-composition edge in the component manifest that doesn't exist).
 */

/**
 * Column span for a grid cell. Numbers span that many tracks of whatever
 * `columns` the parent grid declares. Fraction strings assume a 12-column
 * grid (`columns={12}`): `'25%'`→3, `'33%'`→4, `'50%'`→6, `'67%'`→8,
 * `'75%'`→9 tracks. `'100%'` / `'full'` span the entire row (`1 / -1`) and
 * are safe in ANY grid, including auto-fit.
 */
export type GridItemSpan = number | 'full' | '25%' | '33%' | '50%' | '67%' | '75%' | '100%';

/** Fraction → 12-col track count. 100%/full handled separately (1 / -1). */
const FRACTION_TRACKS: Record<Exclude<GridItemSpan, number | 'full' | '100%'>, number> = {
  '25%': 3,
  '33%': 4,
  '50%': 6,
  '67%': 8,
  '75%': 9,
};

/**
 * Resolve a `GridItemSpan` to a CSS `grid-column` value (or `undefined` when
 * no span is set; callers substitute `'auto'`).
 * - `undefined` → `undefined`
 * - `'full'` / `'100%'` → `'1 / -1'`
 * - number → `'span N'`
 * - fraction → `'span <tracks>'`
 */
export function resolveGridItemSpan(span: GridItemSpan | undefined): string | undefined {
  if (span === undefined) return undefined;
  if (span === 'full' || span === '100%') return '1 / -1';
  if (typeof span === 'number') return `span ${span}`;
  return `span ${FRACTION_TRACKS[span]}`;
}

/**
 * Resolve a span against a graduated-collapse step's column count: spans that
 * fit keep their track count, spans >= the step's columns clamp to the full
 * row (`1 / -1`), full-row spans stay full-row, span-less stays `auto`.
 */
export function resolveCollapsedGridItemSpan(
  span: GridItemSpan | undefined,
  columns: number,
): string {
  if (span === undefined) return 'auto';
  if (span === 'full' || span === '100%' || columns <= 1) return '1 / -1';
  const tracks = typeof span === 'number' ? span : FRACTION_TRACKS[span];
  return tracks >= columns ? '1 / -1' : `span ${tracks}`;
}
