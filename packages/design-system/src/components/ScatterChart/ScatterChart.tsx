import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import { useControllableState } from '../_internal/useControllableState';
import { useSize } from '../_internal/useSize';
import { ChartLegend } from '../Chart/ChartLegend';
import { ChartTooltip } from '../Chart/ChartTooltip';
import {
  LABEL_GAP,
  MARKER_RADIUS,
  X_LABEL_BASELINE,
  markerPath,
  markerShape,
} from '../Chart/chartModel';
import {
  computeScatterLayout,
  inspectionOrder,
  nearestDot,
  resolveScatterSeries,
  scatterSizeDomain,
  type ScatterReference,
  type ScatterSeries,
  type ScatterXScale,
} from './scatterModel';
import styles from './ScatterChart.module.scss';

export type { ScatterPoint, ScatterReference, ScatterSeries, ScatterXScale } from './scatterModel';

export interface ScatterChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and caption of its data table, e.g. "Bowl vs meal size". Required. */
  label: string;
  /**
   * Point groups to plot, in a stable order. Colour: `color` pins a palette slot (1–8); series without it fill the
   * remaining free slots in order. Each slot also has its own marker shape, so identity never relies on colour alone.
   */
  series: ScatterSeries[];
  /** X-axis kind. `'number'` (default): linear. `'time'`: `x` is a `Date` or epoch ms; `formatX` then receives epoch ms. */
  xScale?: ScatterXScale;
  /** Fixed x range. Default: the data extent (nice-rounded on a `'number'` axis). Points outside are clipped. */
  xDomain?: [number | Date, number | Date];
  /** Fixed y range. Default: the data extent, including 0 when every y ≥ 0, nice-rounded. Points outside are clipped. */
  yDomain?: [number, number];
  /** Name of the x quantity, e.g. "Bowl weight"; heads the data-table column and names x in the announcement. Required. */
  xLabel: string;
  /** Name of the y quantity, e.g. "Meal size"; heads the data-table column and names y in the announcement. Required. */
  yLabel: string;
  /** Formats x for ticks, tooltip, announcement and table (epoch ms on a `'time'` axis). Required. */
  formatX: (x: number) => string;
  /** Formats y for ticks, tooltip, announcement and table. Required. */
  formatY: (y: number) => string;
  /** Formats `size` for tooltip, announcement and table. Required when any point has `size` (dev warning otherwise). */
  formatSize?: (size: number) => string;
  /** Name of `size` in the tooltip, announcement and table header, e.g. "Calories". Default: translated "Size". */
  sizeLabel?: string;
  /** App-computed reference line (e.g. a recommended ratio), drawn dashed in neutral ink and listed in the legend. */
  reference?: ScatterReference;
  /** Draw a dashed least-squares line per visible series over its own x-extent (series with ≥2 distinct x only). Decorative. Default `false`. */
  trendLine?: boolean;
  /** EmptyState title when no series has a point. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /** Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored; the last visible series can't be hidden. */
  hiddenSeries?: string[];
  /** Called with the next hidden keys when the user toggles a legend item. */
  onHiddenSeriesChange?: (keys: string[]) => void;
  /** Short note under the plot; takes its own row, also describes the plot for screen readers and stays in the empty state. */
  footnote?: ReactNode;
}

/** Pointer hit radius around a dot centre (`--space-6`). */
const HIT_RADIUS = 24;
/** Fallbacks for `--scatter-dot-min` / `--scatter-dot-max` (`--space-1` / `--space-4`) where computed styles don't resolve (jsdom). */
const DOT_MIN = 4;
const DOT_MAX = 16;
/** Legend entry for `reference`: not a series, so it can't collide with a series key or be toggled. */
const REFERENCE_KEY = '\0reference';
const NO_HIDDEN: string[] = [];

const seriesStyle = (slot: number) =>
  ({ '--chart-series-color': `var(--chart-series-${slot})` }) as CSSProperties;

// ponytail: read once per plot element; a theme that changes these tokens at runtime needs a remount.
function readPx(el: Element | null, name: string, fallback: number) {
  if (!el) return fallback;
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

type Inspected = { seriesKey: string; index: number };

/** Same rule as the layout: a non-finite `size` is no size. */
const hasSizeValue = (s: number | undefined): s is number => s !== undefined && Number.isFinite(s);

/**
 * Scatter plot of x/y points per series, with optional size, trend and reference lines.
 * @see docs/components/ScatterChart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name always win.
export const ScatterChart = forwardRef<HTMLElement, ScatterChartProps>(function ScatterChart(
  {
    label,
    series,
    xScale = 'number',
    xDomain,
    yDomain,
    xLabel,
    yLabel,
    formatX,
    formatY,
    formatSize,
    sizeLabel,
    reference,
    trendLine,
    emptyMessage,
    hiddenSeries,
    onHiddenSeriesChange,
    footnote,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const resolved = useMemo(() => resolveScatterSeries(series), [series]);
  const hasSize = resolved.some((s) => s.points.some((p) => hasSizeValue(p.size)));
  const missingFormatSize = hasSize && !formatSize;
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !missingFormatSize) return;
    console.warn('[ScatterChart] Points have `size` but `formatSize` is missing.');
  }, [missingFormatSize]);
  const sizeText = formatSize ?? String;
  const sizeName = sizeLabel || t('scatterChart.size');

  const [rawHidden, setHidden] = useControllableState<string[]>({
    value: hiddenSeries,
    defaultValue: NO_HIDDEN,
    onChange: onHiddenSeriesChange,
  });
  const hidden = useMemo(() => {
    const known = rawHidden.filter((k) => resolved.some((s) => s.key === k));
    // A controlled set can hide every series: ignore it so the plot is never blank.
    return known.length > 0 && known.length >= resolved.length ? NO_HIDDEN : known;
  }, [rawHidden, resolved]);
  const visible = useMemo(
    () => resolved.filter((s) => !hidden.includes(s.key)),
    [resolved, hidden],
  );
  const empty = resolved.every((s) => s.points.length === 0);

  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusKey = hoverKey ?? focusedKey;
  const hintId = useId();
  const footnoteId = useId();
  const clipId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={styles.footnote}>
      {footnote}
    </div>
  );

  const [setPlotEl, size, plotEl] = useSize<HTMLDivElement>();
  const sizeRange = useMemo<[number, number]>(
    () => [
      readPx(plotEl, '--scatter-dot-min', DOT_MIN),
      readPx(plotEl, '--scatter-dot-max', DOT_MAX),
    ],
    [plotEl],
  );
  // Over every series, hidden included, so a legend toggle never resizes the remaining dots.
  const sizeDomain = useMemo(() => scatterSizeDomain(resolved), [resolved]);
  const layout = useMemo(
    () =>
      !empty && size.width > 0 && size.height > 0
        ? computeScatterLayout({
            series: visible,
            xScale,
            xDomain,
            yDomain,
            width: size.width,
            height: size.height,
            formatX,
            formatY,
            reference,
            trendLine,
            sizeRange,
            sizeDomain,
          })
        : null,
    [
      empty,
      size.width,
      size.height,
      visible,
      xScale,
      xDomain,
      yDomain,
      formatX,
      formatY,
      reference,
      trendLine,
      sizeRange,
      sizeDomain,
    ],
  );

  const order = useMemo(() => inspectionOrder(visible), [visible]);
  const [active, setActive] = useState<Inspected | null>(null);
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | null>(null);
  // A hidden series or new data can drop the inspected point: treat it as nothing inspected.
  const pos = active
    ? order.findIndex((o) => o.seriesKey === active.seriesKey && o.index === active.index)
    : -1;
  const currentSeries = pos >= 0 ? visible.find((s) => s.key === active!.seriesKey) : undefined;
  const currentPoint = currentSeries?.points[active!.index];
  const currentDot =
    pos >= 0
      ? layout?.dots.find((d) => d.seriesKey === active!.seriesKey && d.index === active!.index)
      : undefined;

  const inspect = (next: Inspected | null, source: 'pointer' | 'keyboard' | null) => {
    setActive(next);
    setActiveSource(next === null ? null : source);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = order.length;
    if (n === 0) return;
    let next: number | null;
    switch (e.key) {
      case 'ArrowRight':
        next = pos < 0 ? 0 : Math.min(n - 1, pos + 1);
        break;
      case 'ArrowLeft':
        next = pos < 0 ? n - 1 : Math.max(0, pos - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      case 'Escape':
        if (pos < 0) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    inspect(next === null ? null : order[next], 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup, which we ignore);
  // dismiss it on the next press outside the plot, as Chart does.
  const pointerActive = activeSource === 'pointer' && pos >= 0;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setActiveSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout) return;
    const r = e.currentTarget.getBoundingClientRect();
    const hit = nearestDot(layout, e.clientX - r.left, e.clientY - r.top, HIT_RADIUS);
    if (hit) inspect({ seriesKey: hit.seriesKey, index: hit.index }, 'pointer');
    // A miss clears a pointer inspection (and any press in the plot), but a hover never steals the keyboard's.
    else if (e.type === 'pointerdown' || activeSource === 'pointer') inspect(null, null);
  };

  const anchorX = currentDot?.cx;
  const anchorY = currentDot ? currentDot.cy - currentDot.r : undefined;
  const point = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  const hasLabels = visible.some((s) => s.points.some((p) => p.label));
  const liveText =
    activeSource === 'keyboard' && currentSeries && currentPoint
      ? `${currentSeries.label}: ${xLabel} ${formatX(currentPoint.x)}, ${yLabel} ${formatY(currentPoint.y)}${
          hasSizeValue(currentPoint.size) ? `, ${sizeName} ${sizeText(currentPoint.size)}` : ''
        }${currentPoint.label ? `. ${currentPoint.label}` : ''}`
      : '';

  const visibleCount = resolved.length - hidden.length;
  const toggle = (key: string) => {
    if (key === REFERENCE_KEY) return;
    if (hidden.includes(key)) setHidden(hidden.filter((k) => k !== key));
    // Never hide the last visible series: an empty plot is a dead end.
    else if (visibleCount > 1) setHidden([...hidden, key]);
  };
  const activeKey = focusKey !== null && visible.some((s) => s.key === focusKey) ? focusKey : null;
  const legendItems = [
    ...resolved.map((s) => ({
      key: s.key,
      label: s.label,
      slot: s.slot,
      comparison: false,
      overflow: s.overflow,
      locked: visibleCount === 1 && !hidden.includes(s.key),
      parentHidden: false,
    })),
    // Slot 0 is Chart's neutral ink; `comparison` gives it the dashed swatch of a line.
    ...(reference
      ? [
          {
            key: REFERENCE_KEY,
            label: reference.label,
            slot: 0,
            comparison: true,
            overflow: false,
            locked: true,
            parentHidden: false,
          },
        ]
      : []),
  ];

  if (empty) {
    return (
      <figure
        {...rest}
        ref={ref}
        role="figure"
        aria-label={label}
        aria-labelledby={undefined}
        data-empty=""
        data-footnote={hasFootnote || undefined}
        className={clsx(styles.root, className)}
      >
        <EmptyState title={emptyMessage || t('chart.empty')} size="sm" />
        {footnoteEl}
      </figure>
    );
  }

  return (
    <figure
      {...rest}
      ref={ref}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      data-footnote={hasFootnote || undefined}
      className={clsx(styles.root, className)}
    >
      {legendItems.length > 1 ? (
        <ChartLegend
          items={legendItems}
          hidden={hidden}
          onToggle={toggle}
          onHoverKey={setHoverKey}
          onFocusKey={setFocusedKey}
        />
      ) : (
        <span />
      )}
      <VisuallyHidden id={hintId}>{t('scatterChart.keyboardHint')}</VisuallyHidden>
      <div
        ref={setPlotEl}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={hasFootnote ? `${hintId} ${footnoteId}` : hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        // Touch fires pointerleave right after pointerup; keep the tapped tooltip (an outside press clears it).
        onPointerLeave={(e) =>
          e.pointerType !== 'touch' && activeSource === 'pointer' && inspect(null, null)
        }
        onBlur={() => inspect(null, null)}
      >
        {layout && (
          <svg
            className={styles.svg}
            width={size.width}
            height={size.height}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id={clipId}>
                <rect
                  x={layout.plot.x}
                  y={layout.plot.y}
                  width={layout.plot.width}
                  height={layout.plot.height}
                />
              </clipPath>
            </defs>
            <g className={styles.grid}>
              {layout.yTicks.map((tick) => (
                <line
                  key={tick.value}
                  x1={layout.plot.x}
                  x2={layout.plot.x + layout.plot.width}
                  y1={tick.pos}
                  y2={tick.pos}
                />
              ))}
            </g>
            <g className={styles.axis}>
              {layout.yTicks.map((tick) => (
                <text
                  key={tick.value}
                  x={layout.plot.x - LABEL_GAP}
                  y={tick.pos}
                  dy="0.32em"
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              ))}
              {layout.xTicks.map((tick) => (
                <text
                  key={tick.value}
                  x={tick.pos}
                  y={size.height - X_LABEL_BASELINE}
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              ))}
            </g>
            {/* Trend lines and out-of-domain points must never draw outside the plot. */}
            <g clipPath={`url(#${clipId})`} data-scatter-marks="">
              {layout.referencePath && (
                <path
                  className={styles.reference}
                  d={layout.referencePath}
                  data-scatter-reference=""
                />
              )}
              {visible.map((s) => (
                <g
                  key={s.key}
                  className={styles.series}
                  style={seriesStyle(s.slot)}
                  data-series={s.key}
                  data-dimmed={activeKey !== null && activeKey !== s.key ? '' : undefined}
                >
                  {layout.trends
                    .filter((tr) => tr.seriesKey === s.key)
                    .map((tr) => (
                      <path
                        key="trend"
                        className={styles.trend}
                        d={tr.path}
                        data-scatter-trend=""
                      />
                    ))}
                </g>
              ))}
              {/* Dots in layout paint order (largest first) across series, so small ones stay on top. */}
              {layout.dots.map((d) => (
                <g
                  key={`${d.seriesKey}\0${d.index}`}
                  className={styles.series}
                  style={seriesStyle(d.slot)}
                  data-series={d.seriesKey}
                  data-dimmed={activeKey !== null && activeKey !== d.seriesKey ? '' : undefined}
                >
                  <path
                    className={styles.dot}
                    d={markerPath(markerShape(d.slot), 0, 0, d.r)}
                    transform={`translate(${d.cx},${d.cy})`}
                    data-scatter-dot=""
                  />
                </g>
              ))}
              {currentDot && (
                <g className={styles.series} style={seriesStyle(currentDot.slot)}>
                  <path
                    className={styles.marker}
                    d={markerPath(
                      markerShape(currentDot.slot),
                      0,
                      0,
                      Math.max(currentDot.r, MARKER_RADIUS) + 1,
                    )}
                    transform={`translate(${currentDot.cx},${currentDot.cy})`}
                  />
                </g>
              )}
            </g>
          </svg>
        )}
      </div>
      {footnoteEl}
      <ChartTooltip
        anchor={plotEl}
        point={point}
        title={currentPoint ? formatX(currentPoint.x) : ''}
        rows={
          currentSeries && currentPoint
            ? [
                {
                  key: currentSeries.key,
                  label: currentSeries.label,
                  slot: currentSeries.slot,
                  comparison: false,
                  value: formatY(currentPoint.y),
                },
              ]
            : []
        }
        details={
          hasSizeValue(currentPoint?.size) ? [`${sizeName}: ${sizeText(currentPoint.size)}`] : []
        }
        notes={currentPoint?.label ? [currentPoint.label] : []}
      />
      <LiveRegion>{liveText}</LiveRegion>
      <VisuallyHidden as="div">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('scatterChart.series')}</th>
              <th scope="col">{xLabel}</th>
              <th scope="col">{yLabel}</th>
              {hasSize && <th scope="col">{sizeName}</th>}
              {hasLabels && <th scope="col">{t('scatterChart.pointLabel')}</th>}
            </tr>
          </thead>
          <tbody>
            {visible.flatMap((s) =>
              s.points.map((p, i) => (
                <tr key={`${s.key}\0${i}`}>
                  <th scope="row">{s.label}</th>
                  <td>{formatX(p.x)}</td>
                  <td>{formatY(p.y)}</td>
                  {hasSize && <td>{hasSizeValue(p.size) ? sizeText(p.size) : ''}</td>}
                  {hasLabels && <td>{p.label ?? ''}</td>}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
});
