import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../Card';
import { VisuallyHidden } from '../VisuallyHidden';
import { WidgetShape, type WidgetShapeKind } from '../WidgetPreview/WidgetShape';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './DashboardWidget.module.scss';

/** Presentation variant of a dashboard widget card. */
export type DashboardWidgetVariant = 'standard' | 'list' | 'kpi' | 'chart';

/** KPI trend/delta shown under the value. */
export interface DashboardWidgetTrend {
  /** Visible delta text, e.g. "+12% vs last month". */
  label: ReactNode;
  /** Arrow direction; also the hidden "Increase / Decrease / No change" word read before `label`. */
  direction: 'up' | 'down' | 'flat';
  /**
   * Colour meaning. Defaults from `direction`: up → `positive`, down → `negative`,
   * flat → `neutral`. Override when "up" is bad (churn, overdue tasks).
   */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface DashboardWidgetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Presentation variant. Default `'standard'`.
   * - `'standard'` — header (title + actions) over a padded scrolling body. Today's widget card.
   * - `'list'` — same fixed header as `standard`; flush scrolling body so `Card.List` bleeds edge to edge.
   * - `'kpi'` — compact muted title, a large `value`, optional `trend`; optional `children` below. No scrolling.
   * - `'chart'` — compact header; flush non-scrolling body that fills the cell (give the plot `height: 100%`).
   */
  variant?: DashboardWidgetVariant;
  /** Widget title, rendered as the heading at `headerLevel`. Required. */
  title: ReactNode;
  /**
   * Secondary, non-interactive header text such as freshness ("Updated 3 minutes ago") or
   * status. Sits before `actions` and yields first in a narrow cell: it truncates, then hides,
   * before the title shrinks, while `actions` never shrinks. Also describes the body region
   * (`aria-describedby`) for `standard` / `list`. Repeat it in the refresh button's
   * tooltip if it matters when truncated.
   */
  meta?: ReactNode;
  /** Header actions, e.g. the edit-mode overflow `DropdownMenu`. Never wraps. */
  actions?: ReactNode;
  /** Heading level of the title. Default `'h3'`. */
  headerLevel?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** KPI value (`variant="kpi"` only), e.g. `"128"` or a formatted currency node. */
  value?: ReactNode;
  /** KPI trend (`variant="kpi"` only). */
  trend?: DashboardWidgetTrend;
  /**
   * Show a variant-matched loading skeleton instead of the body (and, for kpi, instead of
   * `value`/`trend`); title and actions stay. Adds visually hidden "Loading…" body text and
   * `aria-busy`. Deliberately NO live region: a dashboard loads many widgets at once, so
   * per-widget announcements would flood screen readers — announce "dashboard loaded" once
   * at page level if needed. Default `false`.
   */
  loading?: boolean;
  /** Widget body. Pass `ErrorState` / `EmptyState` here for error and empty states. */
  children?: ReactNode;
}

const LOADING_SHAPE: Record<DashboardWidgetVariant, WidgetShapeKind> = {
  standard: 'lines',
  list: 'list',
  kpi: 'kpi',
  chart: 'chart',
};

const DEFAULT_SENTIMENT = { up: 'positive', down: 'negative', flat: 'neutral' } as const;
const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

function TrendIcon({ direction }: { direction: DashboardWidgetTrend['direction'] }) {
  const Icon = TREND_ICON[direction];
  return <Icon size={16} aria-hidden="true" />;
}
const TREND_WORD = { up: 'trendUp', down: 'trendDown', flat: 'trendFlat' } as const;

/**
 * Dashboard canvas-cell card with standard / list / kpi / chart presentation and a variant-matched loading skeleton.
 * @see docs/components/DashboardWidget.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / handlers to the Card root.
export const DashboardWidget = forwardRef<HTMLDivElement, DashboardWidgetProps>(
  function DashboardWidget(
    {
      variant = 'standard',
      title,
      actions,
      meta,
      headerLevel = 'h3',
      value,
      trend,
      loading = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();
    const titleId = useId();
    const metaId = useId();
    const skeleton = (
      <>
        <WidgetShape kind={LOADING_SHAPE[variant]} mode="loading" />
        <VisuallyHidden>{t('dashboardWidget.loading')}</VisuallyHidden>
      </>
    );

    const header = (
      <Card.Header
        headerLevel={headerLevel}
        action={actions}
        meta={meta != null ? <span id={metaId}>{meta}</span> : undefined}
        className={styles[`header-${variant}`]}
      >
        <span id={titleId}>{title}</span>
      </Card.Header>
    );

    const bodyClass = clsx(
      variant === 'kpi' && styles.kpiBody,
      variant === 'chart' && styles.chartBody,
      variant === 'standard' && styles.scrollBody,
      variant === 'list' && [styles.scrollBody, !loading && styles.flush],
    );
    const content = loading ? (
      skeleton
    ) : variant === 'kpi' ? (
      <>
        {value != null && <div className={styles.value}>{value}</div>}
        {trend && (
          <div
            className={styles.trend}
            data-sentiment={trend.sentiment ?? DEFAULT_SENTIMENT[trend.direction]}
          >
            <TrendIcon direction={trend.direction} />
            <VisuallyHidden>{t(`dashboardWidget.${TREND_WORD[trend.direction]}`)} </VisuallyHidden>
            <span>{trend.label}</span>
          </div>
        )}
        {children}
      </>
    ) : (
      children
    );
    // Always a Card.Body: Card only builds its fill column (header fixed, body flexes)
    // for a direct Card.Body child. Only standard/list scroll.
    const body =
      variant === 'kpi' || variant === 'chart' ? (
        <Card.Body className={bodyClass}>{content}</Card.Body>
      ) : (
        <Card.Body
          scroll
          data-scroll=""
          role="group"
          aria-labelledby={titleId}
          aria-describedby={meta != null ? metaId : undefined}
          className={bodyClass}
        >
          {content}
        </Card.Body>
      );

    return (
      <Card
        ref={ref}
        fill
        padding="none"
        data-variant={variant}
        aria-busy={loading || undefined}
        className={clsx(styles.root, className)}
        {...rest}
      >
        {header}
        {body}
      </Card>
    );
  },
);
