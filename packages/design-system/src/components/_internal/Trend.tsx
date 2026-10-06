import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import type { DashboardWidgetTrend } from '../DashboardWidget/DashboardWidget';

const DEFAULT_SENTIMENT = { up: 'positive', down: 'negative', flat: 'neutral' } as const;
const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const TREND_WORD = { up: 'trendUp', down: 'trendDown', flat: 'trendFlat' } as const;

/**
 * Internal: KPI trend line shared by DashboardWidget (kpi) and StatTile. Markup only;
 * the caller's `className` sets size and colours (style `[data-sentiment]` per component).
 */
export function Trend({ trend, className }: { trend: DashboardWidgetTrend; className?: string }) {
  const t = useTranslation();
  const Icon = TREND_ICON[trend.direction];
  return (
    <div
      className={className}
      data-sentiment={trend.sentiment ?? DEFAULT_SENTIMENT[trend.direction]}
    >
      <Icon size={16} aria-hidden="true" />
      <VisuallyHidden>{t(`dashboardWidget.${TREND_WORD[trend.direction]}`)} </VisuallyHidden>
      <span>{trend.label}</span>
    </div>
  );
}
