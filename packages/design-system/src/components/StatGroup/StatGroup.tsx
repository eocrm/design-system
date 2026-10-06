import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { Grid, type GridGap } from '../Grid';
import { StatGroupLoadingContext } from './StatGroupContext';
import styles from './StatGroup.module.scss';

export interface StatGroupProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * Minimum tile width before the grid drops a column (auto-fit). Any CSS length.
   * Clamped to the group's width, so in a cell narrower than one column a single
   * tile shrinks instead of overflowing. Default `'11rem'`.
   */
  minColumnWidth?: string;
  /** Gap between tiles. `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). */
  gap?: GridGap;
  /**
   * Loading state for every tile: labels and icons stay; each value and trend becomes a
   * skeleton with visually hidden "Loading…" in the value slot, and footnotes hide.
   * Deliberately NO live region: a dashboard loads many widgets at once, so announcements
   * would flood screen readers. No `aria-busy` either: it tells AT to defer reading the
   * region, which would hide that text. Default `false`.
   */
  loading?: boolean;
  /** `StatTile` elements. */
  children?: ReactNode;
}

/**
 * Responsive grid of KPI tiles (`StatTile`) with a shared loading state.
 * @see docs/components/StatGroup.md
 */
// {...rest} last (Pattern A) so the consumer's aria-label / data-* / className reach the <ul>.
export const StatGroup = forwardRef<HTMLUListElement, StatGroupProps>(function StatGroup(
  { minColumnWidth = '11rem', gap = 'md', loading = false, className, children, ...rest },
  ref,
) {
  return (
    <StatGroupLoadingContext.Provider value={loading}>
      <Grid
        ref={ref as Ref<HTMLElement>}
        as="ul"
        // role="list": Safari drops list semantics from list-style:none lists.
        role="list"
        minColumnWidth={`min(${minColumnWidth}, 100%)`}
        gap={gap}
        // The translated hidden "Loading…" text lives in each StatTile (by design: no live region).
        className={clsx(styles.root, className)}
        {...rest}
      >
        {children}
      </Grid>
    </StatGroupLoadingContext.Provider>
  );
});
