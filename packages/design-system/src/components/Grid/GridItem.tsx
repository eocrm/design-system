import { forwardRef, useContext, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import {
  resolveGridItemSpan,
  resolveCollapsedGridItemSpan,
  type GridItemSpan,
} from '../_internal/gridSpan';
import { CollapseColumnsContext } from '../_internal/collapse';
import styles from './Grid.module.scss';

// The span vocabulary (type + fraction→track resolver) is shared with
// Sortable.Item's grid arrangement; it lives in _internal/gridSpan so neither
// component imports the other. Re-exported here so `GridItemSpan` stays part of
// Grid's public type surface.
export type { GridItemSpan };

/** Elements `Grid.Item` can render as. `'li'` pairs with `<Grid as="ul">`. */
export type GridItemAs = 'div' | 'li' | 'section' | 'article' | 'aside';

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
  const resolved = resolveGridItemSpan(span);

  // Set only when a graduated (map-form) `collapseBelow` grid is an
  // ancestor — same always-stamp rationale as `--grid-item-span`: custom
  // properties inherit, so every map key present on the container gets
  // stamped on every Item (see resolveCollapsedGridItemSpan for clamping).
  const collapseMap = useContext(CollapseColumnsContext);
  const collapseVars = collapseMap
    ? Object.fromEntries(
        (Object.keys(collapseMap) as (keyof typeof collapseMap)[]).map((b) => [
          `--grid-item-span-${b}`,
          resolveCollapsedGridItemSpan(span, collapseMap[b]!),
        ]),
      )
    : undefined;

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
      style={{
        ...(style as CSSProperties),
        ...collapseVars,
        ['--grid-item-span' as string]: resolved ?? 'auto',
      }}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );
});
