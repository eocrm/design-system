import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Grid.module.scss';

/**
 * Column span for a `Grid.Item`. Numbers span that many tracks of whatever
 * `columns` the parent Grid declares. Fraction strings assume a 12-column
 * grid (`columns={12}`): `'25%'`→3, `'33%'`→4, `'50%'`→6, `'67%'`→8,
 * `'75%'`→9 tracks. `'100%'` / `'full'` span the entire row (`1 / -1`) and
 * are safe in ANY grid, including auto-fit.
 */
export type GridItemSpan = number | 'full' | '25%' | '33%' | '50%' | '67%' | '75%' | '100%';

/** Elements `Grid.Item` can render as. `'li'` pairs with `<Grid as="ul">`. */
export type GridItemAs = 'div' | 'li' | 'section' | 'article' | 'aside';

/** Fraction → 12-col track count. 100%/full handled separately (1 / -1). */
const FRACTION_TRACKS: Record<Exclude<GridItemSpan, number | 'full' | '100%'>, number> = {
  '25%': 3,
  '33%': 4,
  '50%': 6,
  '67%': 8,
  '75%': 9,
};

export interface GridItemProps extends HTMLAttributes<HTMLElement> {
  /**
   * Column span. Omit for a single track (auto placement).
   * - number — `span N` of the parent's `columns`.
   * - `'25%' | '33%' | '50%' | '67%' | '75%'` — fractions of a 12-column
   *   grid; use with `columns={12}` (other counts won't produce the named
   *   fraction — documented, not validated).
   * - `'100%'` / `'full'` — the entire row; safe with any Grid variant.
   */
  span?: GridItemSpan;
  /** Element to render. Default `'div'`. Use `'li'` inside `<Grid as="ul">`. */
  as?: GridItemAs;
}

/**
 * A cell of `<Grid>` with an explicit column span. Opt-in — plain children
 * are still valid Grid cells. See `GridItemSpan` for the span model
 * (numeric tracks vs 12-col fractions).
 *
 * @example
 * // Dashboard widgets on a 12-column grid, collapsing under 640px.
 * <Grid columns={12} gap="md" collapseBelow="md">
 *   <Grid.Item span="25%"><Card>Small</Card></Grid.Item>
 *   <Grid.Item span="75%"><Card>Wide</Card></Grid.Item>
 *   <Grid.Item span="100%"><Card>Full row</Card></Grid.Item>
 * </Grid>
 *
 * @remarks Anti-patterns
 * - ❌ Fraction spans (other than `'100%'`) with `columns` ≠ 12 — the span
 *   is a fixed track count (e.g. `'50%'` = 6 tracks), so a 4-column grid
 *   overflows into implicit tracks.
 * - ❌ Numeric `span` larger than `columns` — same implicit-track overflow.
 */
export const GridItem = forwardRef<HTMLElement, GridItemProps>(function GridItem(
  { span, as = 'div', className, style, ...rest },
  ref,
) {
  const resolved =
    span === undefined
      ? undefined
      : span === 'full' || span === '100%'
        ? '1 / -1'
        : typeof span === 'number'
          ? `span ${span}`
          : `span ${FRACTION_TRACKS[span]}`;

  const Tag = as as unknown as 'div';
  return (
    // Grid/Stack/Cluster are the layout primitives — `grid-column` via the
    // `.item` class is Grid.Item's sanctioned job (Rule 4 does not apply to
    // the layout family's own placement props).
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={clsx(styles.item, className)}
      // Always set the property — custom properties inherit, so an unset
      // span-less item nested under a spanned one would resolve the
      // ancestor's value instead of `auto`.
      style={{ ...(style as CSSProperties), ['--grid-item-span' as string]: resolved ?? 'auto' }}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );
});
