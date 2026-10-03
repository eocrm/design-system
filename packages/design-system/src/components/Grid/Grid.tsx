import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactElement } from 'react';
import clsx from 'clsx';
import styles from './Grid.module.scss';
import { GridItem } from './GridItem';
import {
  CollapseColumnsContext,
  COLLAPSE_BREAKPOINTS,
  collapseTrackTemplate,
  type CollapseBreakpoint,
  type CollapseColumnsMap,
} from '../_internal/collapse';

/** Gap between cells. Same scale as Stack/Cluster: pixels 4/8/12/16/24/32. */
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Cross-axis (vertical within row) alignment of each cell. */
export type GridAlignItems = 'start' | 'center' | 'end' | 'stretch';

/** Main-axis (horizontal within track) alignment of each cell. */
export type GridJustifyItems = 'start' | 'center' | 'end' | 'stretch';

/** Container-width threshold below which a fixed-column grid collapses. `sm` 480px / `md` 640px / `lg` 768px. */
export type GridCollapseBreakpoint = CollapseBreakpoint;
export type { CollapseColumnsMap };

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
   * behavior is `stretch`; omit to use the default. Useful for cards of varying intrinsic height.
   */
  alignItems?: GridAlignItems;
  /**
   * Main-axis (horizontal within track) alignment of each cell. Default
   * browser behavior is `stretch`; omit to use the default.
   */
  justifyItems?: GridJustifyItems;
  /** Element to render. Default `'div'`. Limited to `div`, `section`, `ul`, `ol`, `nav`, `main`, `aside`, `article`, `header`, `footer` rather than fully polymorphic. */
  as?: GridAs;
}

interface GridFixedColumns extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /** Fixed number of equal-width columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
  /**
   * Collapse to a single visual column when the GRID'S OWN width (container
   * query, not viewport) drops below the preset: `sm` 480px / `md` 640px /
   * `lg` 768px. Every child spans the full row below the threshold —
   * `Grid.Item` spans included. Only valid with `columns` (auto-fit grids
   * already reflow).
   *
   * Consumer inline `style={{ gridColumn }}` on a child still wins below the
   * threshold (inline beats any stylesheet rule) — don't do that; use
   * `Grid.Item span` instead.
   *
   * ❌ Anti-pattern: a `collapseBelow` grid must get its width from its
   * parent. `container-type: inline-size` zeroes the grid's contribution to
   * intrinsic sizing, so in an intrinsic-width context (`Split`'s default
   * `auto` aside track, a `Cluster` item, `width: max-content`) it renders at
   * width 0 — give the parent a concrete width instead. Whichever element
   * carries the containment also becomes the containing block for
   * absolutely-positioned descendants (layout containment) — the grid itself
   * for the string form, the wrapper below for the map form.
   *
   * Also accepts a graduated breakpoint→columns map, e.g.
   * `collapseBelow={{ md: 6, sm: 1 }}`: below 640px the grid re-templates to
   * 6 columns (item spans clamp to fit — a span wider than the step becomes a
   * full row), and below 480px to a single column. Use when jumping straight
   * from N columns to 1 wastes tablet widths. When several breakpoints match,
   * the smallest wins. Only `Grid.Item` children get span clamping; plain
   * children auto-place into the step's tracks.
   *
   * ⚠️ The map form (and ONLY the map form) renders an extra wrapper `<div>`
   * around the grid element — it carries `container-type: inline-size`,
   * because re-templating the grid requires querying an ancestor, not the
   * grid itself. Consequences: a `> child` CSS selector aimed at the grid from
   * its parent now hits the wrapper instead, and layout the parent applies to
   * "the Grid" (`flex: 1`, `grid-column`, `align-self` via `className`) lands
   * on the grid *inside* the wrapper, where the parent's layout can't see it —
   * put that layout on an element you control around the Grid. `ref`,
   * `className`, `style`, `as` and all spread props stay on the grid element.
   */
  collapseBelow?: GridCollapseBreakpoint | CollapseColumnsMap;
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
  collapseBelow?: never;
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

const collapseClass: Record<GridCollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};

const stepClass: Record<CollapseBreakpoint, string> = {
  sm: styles.stepSm,
  md: styles.stepMd,
  lg: styles.stepLg,
};

const GridBase = forwardRef<HTMLElement, GridProps>(function Grid(
  {
    gap = 'md',
    alignItems,
    justifyItems,
    as = 'div',
    columns,
    minColumnWidth,
    collapseBelow,
    className,
    style,
    ...rest
  },
  ref,
) {
  const template =
    columns !== undefined
      ? collapseTrackTemplate(columns)
      : `repeat(auto-fit, minmax(${minColumnWidth ?? '240px'}, 1fr))`;

  const collapseMap = typeof collapseBelow === 'object' ? collapseBelow : undefined;
  const collapseKeys = collapseMap
    ? COLLAPSE_BREAKPOINTS.filter((b) => collapseMap[b] !== undefined)
    : [];
  const stepVars = Object.fromEntries(
    collapseKeys.map((b) => [`--grid-columns-${b}`, collapseTrackTemplate(collapseMap![b]!)]),
  );

  // `as` is a string union of intrinsic JSX elements; cast through unknown
  // for the limited union. At runtime React just uses the element name.
  const Tag = as as unknown as 'div';

  // Tag is constrained at the type level via GridAs; the ref + rest casts
  // satisfy React's intrinsic-element signature without per-tag branching.
  const grid = (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={clsx(
        styles.grid,
        gapClass[gap],
        alignItems && alignItemsClass[alignItems],
        justifyItems && justifyItemsClass[justifyItems],
        // String form only: those rules query descendants, so the grid can be
        // its own container. The map form's container is the wrapper below.
        typeof collapseBelow === 'string' && styles.collapsible,
        typeof collapseBelow === 'string' && collapseClass[collapseBelow],
        ...collapseKeys.map((b) => stepClass[b]),
        className,
      )}
      style={{ ...(style as CSSProperties), ...stepVars, ['--grid-columns' as string]: template }}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );

  // Map form only: the step rules re-template the grid itself, and a container
  // query never matches its own container — so the size container has to be a
  // wrapper. `ref`, `className`, `style`, `as` and `{...rest}` all stay on the
  // grid element; the wrapper is a bare div that only carries containment.
  return collapseMap && collapseKeys.length > 0 ? (
    <CollapseColumnsContext.Provider value={collapseMap}>
      <div className={styles.stepContainer}>{grid}</div>
    </CollapseColumnsContext.Provider>
  ) : (
    grid
  );
}) as <T extends GridProps>(props: T & { ref?: React.Ref<HTMLElement> }) => ReactElement;

/**
 * 2D layout primitive: a CSS Grid wrapper with token-driven gap.
 * @see docs/components/Grid.md
 */
export const Grid = Object.assign(GridBase, { Item: GridItem });
