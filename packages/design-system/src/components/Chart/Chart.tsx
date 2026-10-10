import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import { useControllableState } from '../_internal/useControllableState';
import { mergeRefs } from '../_internal/refs';
import { ChartLegend } from './ChartLegend';
import { ChartTable } from './ChartTable';
import {
  computeLayout,
  fitLegend,
  COMPACT_HEIGHT,
  isEmpty,
  DOT_RADIUS,
  LABEL_GAP,
  PALETTE_SIZE,
  X_LABEL_BASELINE,
  resolveSeries,
  visibleSeries,
  type ChartSeries,
  type ChartType,
  type ResolvedSeries,
} from './chartModel';
import styles from './Chart.module.scss';

export type { ChartSeries, ChartType } from './chartModel';

export interface ChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * Chart form. Required.
   * - `'line'` — one line per series; trends over time. Comparison series dashed.
   * - `'bar'` — grouped bars per category; compare a few series per bucket. Comparison bars outlined + light fill.
   * - `'stacked-bar'` — bars stacked per category; parts of a total. Comparison only as `comparisonOf: 'total'` (dashed total line).
   * - `'area'` — stacked areas; parts of a total over time. Same comparison rule as `stacked-bar`.
   */
  type: ChartType;
  /** Accessible name of the figure and caption of its data table, e.g. "Deals won per week". Required. */
  label: string;
  /** X-axis buckets, already formatted by the app ("12 Jan", "W3", "Mar"). `series[].values[i]` belongs to `categories[i]`. */
  categories: string[];
  /**
   * Series to plot, in a stable order: colour follows position (non-comparison series 1–8 get palette slots 1–8),
   * so keep the order fixed when filtering. At most 8 primary series — fold the rest into an "Other" series in the app
   * (series 9+ still render, dashed/outlined, with a dev warning). `values` shorter than `categories` are padded
   * with gaps; `null` is a gap (lines break, bars are absent). `comparisonOf` marks a de-emphasised comparison
   * (e.g. previous period): a series key (line / bar) or `'total'` (stacked-bar / area).
   */
  series: ChartSeries[];
  /** Formats a number for axis ticks, tooltip and data table (the app owns i18n and currency). Required. */
  formatValue: (n: number) => string;
  /** EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /** Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored. */
  hiddenSeries?: string[];
  /** Called with the next hidden keys when the user toggles a legend item. */
  onHiddenSeriesChange?: (keys: string[]) => void;
}

const seriesStyle = (slot: number) =>
  ({
    '--chart-series-color':
      slot === 0 ? 'var(--chart-total-comparison)' : `var(--chart-series-${slot})`,
  }) as CSSProperties;

function useDevWarnings(dropped: string[], overflowCount: number) {
  const droppedKey = dropped.join('|');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (droppedKey) {
      console.warn(
        `[Chart] Ignored comparison series (${droppedKey.split('|').join(', ')}): comparisonOf must name a series in line/bar, or be 'total' in stacked-bar/area.`,
      );
    }
  }, [droppedKey]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (overflowCount > 0) {
      console.warn(
        `[Chart] ${overflowCount} series beyond the ${PALETTE_SIZE}-colour palette reuse colours. Fold the tail into an "Other" series.`,
      );
    }
  }, [overflowCount]);
}

function useSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.floor(width) && prev.height === Math.floor(height)
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

/**
 * Time-series chart (line, bar, stacked bar, area) that fills a `DashboardWidget variant="chart"` body.
 * @see docs/components/Chart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name (incl. aria-labelledby) always win.
export const Chart = forwardRef<HTMLElement, ChartProps>(function Chart(
  {
    type,
    label,
    categories,
    series,
    formatValue,
    emptyMessage,
    hiddenSeries,
    onHiddenSeriesChange,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const resolved = useMemo(
    () => resolveSeries(type, series, categories.length),
    [type, series, categories.length],
  );
  useDevWarnings(resolved.dropped, resolved.overflowCount);

  const [hidden, setHidden] = useControllableState<string[]>({
    value: hiddenSeries,
    defaultValue: [],
    onChange: onHiddenSeriesChange,
  });
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const visible = useMemo(() => visibleSeries(resolved.series, hidden), [resolved.series, hidden]);
  const empty = isEmpty(categories, resolved.series);

  const [plotRef, size] = useSize<HTMLDivElement>();
  const [setRootEl, rootSize] = useSize<HTMLElement>();
  const figureRef = useMemo(
    () => mergeRefs(ref, (el: HTMLElement | null) => setRootEl(el)),
    [ref, setRootEl],
  );
  const layout = useMemo(
    () =>
      !empty && size.width > 0 && size.height > 0
        ? computeLayout({
            type,
            categories,
            series: visible,
            width: size.width,
            height: size.height,
            formatValue,
          })
        : null,
    [empty, size.width, size.height, type, categories, visible, formatValue],
  );

  const parentLabel = (s: ResolvedSeries) =>
    resolved.series.find((p) => p.key === s.comparisonOf)?.label;
  const toggle = (key: string) => {
    if (hidden.includes(key)) {
      setHidden(hidden.filter((k) => k !== key));
      return;
    }
    const target = resolved.series.find((s) => s.key === key);
    const visiblePrimaries = resolved.series.filter(
      (s) => s.comparisonOf === undefined && !hidden.includes(s.key),
    );
    // Never hide the last primary series: an empty plot is a dead end.
    if (target?.comparisonOf === undefined && visiblePrimaries.length <= 1) return;
    setHidden([...hidden, key]);
  };

  const legendItems = resolved.series.map((s) => ({
    key: s.key,
    label: s.label,
    slot: s.slot,
    comparison: s.comparisonOf !== undefined,
    overflow: s.overflow,
    parentLabel: parentLabel(s),
    parentHidden:
      s.comparisonOf !== undefined && s.comparisonOf !== 'total' && hidden.includes(s.comparisonOf),
  }));
  const compact = rootSize.height > 0 && rootSize.height < COMPACT_HEIGHT;
  const maxItems = compact
    ? fitLegend(
        legendItems.map((i) => i.label),
        rootSize.width,
      )
    : legendItems.length;

  const columns = visible.map((s) => ({
    key: s.key,
    header: parentLabel(s) ? `${s.label} (${parentLabel(s)})` : s.label,
    values: s.values,
  }));

  if (empty) {
    return (
      <figure
        {...rest}
        ref={ref}
        role="figure"
        aria-label={label}
        aria-labelledby={undefined}
        data-empty=""
        className={clsx(styles.root, className)}
      >
        <EmptyState title={emptyMessage || t('chart.empty')} size="sm" />
      </figure>
    );
  }

  return (
    <figure
      {...rest}
      ref={figureRef}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      data-compact={compact || undefined}
      className={clsx(styles.root, className)}
    >
      {legendItems.length > 1 ? (
        <ChartLegend
          items={legendItems}
          hidden={hidden}
          maxItems={maxItems}
          onToggle={toggle}
          onFocusKey={setFocusKey}
        />
      ) : (
        <span />
      )}
      <div ref={plotRef} className={styles.plot}>
        {layout && (
          <svg
            className={styles.svg}
            width={size.width}
            height={size.height}
            aria-hidden="true"
            focusable="false"
          >
            <g className={styles.grid}>
              {layout.yTicks.map((tick) => (
                <line
                  key={tick.value}
                  x1={layout.plot.x}
                  x2={layout.plot.x + layout.plot.width}
                  y1={tick.y}
                  y2={tick.y}
                />
              ))}
            </g>
            <g className={styles.axis}>
              {layout.yTicks.map((tick) => (
                <text
                  key={tick.value}
                  x={layout.plot.x - LABEL_GAP}
                  y={tick.y}
                  dy="0.32em"
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              ))}
              {layout.xLabels.map((x) => (
                <text key={x.index} x={x.x} y={size.height - X_LABEL_BASELINE} textAnchor="middle">
                  {x.label}
                </text>
              ))}
            </g>
            {layout.marks.map((m) => (
              <g
                key={m.key}
                className={styles.series}
                style={seriesStyle(m.slot)}
                data-series={m.key}
                data-comparison={m.comparison || undefined}
                data-overflow={m.overflow || undefined}
                data-dimmed={
                  focusKey !== null &&
                  m.key !== focusKey &&
                  resolved.series.find((s) => s.key === m.key)?.comparisonOf !== focusKey
                    ? ''
                    : undefined
                }
              >
                {m.area && <path className={styles.area} d={m.area} />}
                {m.line && <path className={styles.line} d={m.line} />}
                {m.bars?.map((d, i) => d && <path key={i} className={styles.bar} d={d} />)}
                {m.dots.map((p, i) => (
                  <circle key={i} className={styles.dot} cx={p.x} cy={p.y} r={DOT_RADIUS} />
                ))}
              </g>
            ))}
          </svg>
        )}
      </div>
      <ChartTable
        caption={label}
        categoryHeader={t('chart.category')}
        noData={t('chart.noData')}
        categories={categories}
        columns={columns}
        formatValue={formatValue}
      />
    </figure>
  );
});
