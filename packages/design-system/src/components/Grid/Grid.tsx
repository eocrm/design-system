import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactElement } from 'react';
import clsx from 'clsx';
import styles from './Grid.module.scss';

/** Gap between cells. Same scale as Stack/Cluster: pixels 4/8/12/16/24/32. */
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Cross-axis (vertical within row) alignment of each cell. */
export type GridAlignItems = 'start' | 'center' | 'end' | 'stretch';

/** Main-axis (horizontal within track) alignment of each cell. */
export type GridJustifyItems = 'start' | 'center' | 'end' | 'stretch';

/** Limited polymorphic element type. Covers the layout / semantic elements Grid is likely to render as. */
export type GridAs =
  | 'div'
  | 'section'
  | 'ul'
  | 'ol'
  | 'nav'
  | 'main'
  | 'aside'
  | 'article'
  | 'header'
  | 'footer';

interface GridBaseProps {
  /**
   * Gap between cells.
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   * Same scale as Stack and Cluster.
   */
  gap?: GridGap;
  /**
   * Cross-axis (vertical within row) alignment of each cell. Default browser
   * behavior is `stretch`; omit to use the default.
   */
  alignItems?: GridAlignItems;
  /**
   * Main-axis (horizontal within track) alignment of each cell. Default
   * browser behavior is `stretch`; omit to use the default.
   */
  justifyItems?: GridJustifyItems;
  /** Element to render. Default `'div'`. Limited to common layout / semantic elements. */
  as?: GridAs;
}

interface GridFixedColumns extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /** Fixed number of equal-width columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
}

interface GridAutoFit extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /**
   * Minimum column width for auto-fit responsive layout. Columns reflow
   * based on container width — no breakpoints needed. CSS length string
   * like `'240px'` or `'15rem'`. Defaults to `'240px'` when neither
   * `columns` nor `minColumnWidth` is provided.
   */
  minColumnWidth?: string;
  columns?: never;
}

/** Public props — discriminated union enforces mutual exclusion. */
export type GridProps = GridFixedColumns | GridAutoFit;

const gapClass: Record<GridGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const alignItemsClass: Record<GridAlignItems, string> = {
  start: styles.alignItemsStart,
  center: styles.alignItemsCenter,
  end: styles.alignItemsEnd,
  stretch: styles.alignItemsStretch,
};

const justifyItemsClass: Record<GridJustifyItems, string> = {
  start: styles.justifyItemsStart,
  center: styles.justifyItemsCenter,
  end: styles.justifyItemsEnd,
  stretch: styles.justifyItemsStretch,
};

/**
 * 2D layout primitive — CSS Grid wrapper with token-driven gap. Sibling to
 * `<Stack>` (vertical) and `<Cluster>` (horizontal-with-wrap). Use when you
 * need equal-width columns OR a responsive tile layout that reflows by
 * container width (no breakpoints needed).
 *
 * Pick exactly one of `columns` (fixed N equal columns) or `minColumnWidth`
 * (auto-fit responsive). TypeScript enforces this — passing both is a
 * compile error. If you pass neither, Grid defaults to
 * `minColumnWidth="240px"`.
 *
 * @example
 * // Dashboard tile layout — auto-fits to viewport.
 * <Grid gap="md">
 *   {metrics.map(m => <Card key={m.id}>{m.label}: {m.value}</Card>)}
 * </Grid>
 *
 * @example
 * // Two-column form — exactly 2 equal columns at any width.
 * <Grid columns={2} gap="lg">
 *   <Input label="First name" />
 *   <Input label="Last name" />
 *   <Input label="Email" />
 *   <Input label="Phone" />
 * </Grid>
 *
 * @example
 * // Photo gallery — auto-fit with smaller minimum.
 * <Grid minColumnWidth="160px" gap="sm">
 *   {photos.map(p => <img key={p.id} src={p.src} />)}
 * </Grid>
 *
 * @example
 * // Semantic element via `as`.
 * <Grid as="section" columns={3} gap="md" aria-labelledby="dashboard-title">
 *   <Card>...</Card>
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </Grid>
 *
 * @remarks When NOT to use
 * - For vertical flow with a single column — use `<Stack>`.
 * - For unaligned wrapping rows (toolbars, tag lists) — use `<Cluster>`.
 * - For asymmetric or named tracks (`auto 1fr`, named lines) — not
 *   supported in v1; use raw CSS Grid via `className`.
 * - For per-cell span / placement — same answer; raw CSS Grid.
 *
 * @remarks Anti-patterns
 * - ❌ `<Grid>` for a list of clickable items — semantics matter. Use
 *   `<ul><li>` or render Grid with `as="ul"` and `<li>` children.
 * - ❌ `<Grid as="ul">` with non-`<li>` children. The component doesn't
 *   enforce list semantics; consumers must.
 * - ❌ Inline `gridTemplateColumns` in the `style` prop instead of using
 *   `columns` / `minColumnWidth`. Bypasses tokens and the responsive default.
 */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  {
    gap = 'md',
    alignItems,
    justifyItems,
    as = 'div',
    columns,
    minColumnWidth,
    className,
    style,
    ...rest
  },
  ref,
) {
  const template =
    columns !== undefined
      ? `repeat(${columns}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${minColumnWidth ?? '240px'}, 1fr))`;

  // `as` is a string union of intrinsic JSX elements; cast through unknown
  // for the limited union. At runtime React just uses the element name.
  const Tag = as as unknown as 'div';

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={clsx(
        styles.grid,
        gapClass[gap],
        alignItems && alignItemsClass[alignItems],
        justifyItems && justifyItemsClass[justifyItems],
        className,
      )}
      style={{ ...(style as CSSProperties), ['--grid-columns' as string]: template }}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );
}) as <T extends GridProps>(props: T & { ref?: React.Ref<HTMLElement> }) => ReactElement;
