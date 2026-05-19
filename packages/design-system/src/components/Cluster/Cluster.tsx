import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Cluster.module.scss';

/** Horizontal gap between children. Values in pixels: 4 / 8 / 12 / 16 / 24 / 32. */
export type ClusterGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Main-axis distribution. `between` is the toolbar pattern. */
export type ClusterJustify = 'start' | 'center' | 'end' | 'between';

/** Cross-axis alignment. */
export type ClusterAlign = 'start' | 'center' | 'end' | 'baseline';

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between children, in pixels:
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   */
  gap?: ClusterGap;
  /**
   * Horizontal distribution.
   * - `start` (default) — items at the start.
   * - `center` — items centered.
   * - `end` — items at the end. Canonical form-footer pattern.
   * - `between` — first item at start, last at end, gap between. Canonical toolbar pattern (title left, actions right).
   */
  justify?: ClusterJustify;
  /**
   * Vertical alignment.
   * - `start` / `center` (default) / `end` / `baseline`.
   */
  align?: ClusterAlign;
  /**
   * Whether children wrap to additional lines when the container is narrow.
   * - `true` (default) — natural for toolbars and tag lists.
   * - `false` — use sparingly, when overflow is preferable to wrapping
   *   (e.g. inside a narrow table cell with fixed-width action buttons).
   */
  wrap?: boolean;
}

const gapClass: Record<ClusterGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const justifyClass: Record<ClusterJustify, string> = {
  start: styles.justifyStart,
  center: styles.justifyCenter,
  end: styles.justifyEnd,
  between: styles.justifyBetween,
};

const alignClass: Record<ClusterAlign, string> = {
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
  baseline: styles.alignBaseline,
};

/**
 * Horizontal layout primitive that wraps. Use for button rows, toolbars,
 * tag lists, breadcrumbs — anywhere you'd otherwise write
 * `display: flex; gap: ...; flex-wrap: wrap`.
 *
 * @example
 * // Form footer (the most common use):
 * <Cluster justify="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button type="submit">Save</Button>
 * </Cluster>
 *
 * @example
 * // Toolbar: title on the left, actions on the right.
 * <Cluster justify="between" gap="md">
 *   <h1>Users</h1>
 *   <Cluster gap="sm">
 *     <Button variant="secondary">Filter</Button>
 *     <Button>Add user</Button>
 *   </Cluster>
 * </Cluster>
 *
 * @example
 * // Tag list — wraps to multiple lines when narrow.
 * <Cluster gap="xs">
 *   {tags.map(t => <Badge key={t.id} tone={t.tone}>{t.label}</Badge>)}
 * </Cluster>
 *
 * @remarks When NOT to use
 * - For aligned columns of equal width — use CSS Grid. Cluster wraps
 *   unpredictably at narrow widths and isn't a column system.
 * - For content that must never wrap — set `wrap={false}` if you must, but
 *   reconsider whether that's truly required on narrow viewports.
 *
 * @remarks Anti-patterns
 * - ❌ Cluster as a 2-column layout. Use CSS Grid for "two columns, always".
 * - ❌ Inline `style={{ marginLeft: 'auto' }}` on a child to push it right.
 *   Use `justify="between"` (with a sibling on the left) or split into two
 *   Clusters in the parent.
 */
export const Cluster = forwardRef<HTMLDivElement, ClusterProps>(function Cluster(
  { gap = 'md', justify = 'start', align = 'center', wrap = true, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        styles.cluster,
        gapClass[gap],
        justifyClass[justify],
        alignClass[align],
        wrap && styles.wrap,
        className,
      )}
      {...props}
    />
  );
});
