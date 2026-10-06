import { forwardRef, useContext, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Skeleton } from '../Skeleton';
import { VisuallyHidden } from '../VisuallyHidden';
import { Trend } from '../_internal/Trend';
import type { DashboardWidgetTrend } from '../DashboardWidget/DashboardWidget';
import { useTranslation } from '../../i18n/useTranslation';
import { StatGroupLoadingContext } from './StatGroupContext';
import styles from './StatTile.module.scss';

/** Tile trend: same shape as `DashboardWidgetTrend` (`label`, `direction`, optional `sentiment`). */
export type StatTrend = DashboardWidgetTrend;

export interface StatTileProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  /** What the number is, e.g. "Pipeline value". Read first by screen readers. */
  label: ReactNode;
  /**
   * The pre-formatted value: an integer, currency or percentage (`"€1.24M"`, `"38%"`).
   * Required so "no data" is explicit: pass `null` (or `undefined`) and the tile shows
   * "—" with visually hidden "No data". `0` is data and renders as `0`.
   */
  value: ReactNode;
  /**
   * Delta under the value, e.g. `{ label: '12.4% vs previous period', direction: 'up' }`.
   * Arrow + hidden "Increase / Decrease / No change"; colour from `sentiment`, which
   * defaults from `direction` (up → positive). Override when up is bad (overdue tasks).
   */
  trend?: StatTrend;
  /** Small muted note under the trend, e.g. "2 deals in other currencies not included". Hidden while loading. */
  footnote?: ReactNode;
  /** Decorative icon before the label, typically `<IconTile size="sm" … />`. Hidden in very narrow tiles. */
  icon?: ReactNode;
}

/**
 * One KPI tile (label, value, trend, footnote) inside a `StatGroup`.
 * @see docs/components/StatTile.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / handlers to the <li>.
export const StatTile = forwardRef<HTMLLIElement, StatTileProps>(function StatTile(
  { label, value, trend, footnote, icon, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const loading = useContext(StatGroupLoadingContext);

  return (
    <li ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.label}>
        {icon != null && <span className={styles.icon}>{icon}</span>}
        <span>{label}</span>
      </div>
      {loading ? (
        <>
          <div className={styles.value}>
            <Skeleton variant="text" width="60%" />
            <VisuallyHidden>{t('stat.loading')}</VisuallyHidden>
          </div>
          {/* Always, even without a trend prop: loading data usually has no trend yet. */}
          <div className={styles.trend}>
            <Skeleton variant="text" width="45%" />
          </div>
        </>
      ) : (
        <>
          <div className={styles.value}>
            {value == null ? (
              <>
                <span aria-hidden="true">—</span>
                <VisuallyHidden>{t('stat.noData')}</VisuallyHidden>
              </>
            ) : (
              value
            )}
          </div>
          {trend && <Trend trend={trend} className={styles.trend} />}
          {footnote != null && <div className={styles.footnote}>{footnote}</div>}
        </>
      )}
    </li>
  );
});
