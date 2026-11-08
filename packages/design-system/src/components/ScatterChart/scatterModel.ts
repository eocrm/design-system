import { scaleLinear, scaleSqrt, scaleTime } from 'd3-scale';
import {
  assignSlots,
  DOT_RADIUS,
  estimateTextWidth,
  LABEL_GAP,
  PAD_RIGHT,
  X_LABEL_BASELINE,
  PAD_TOP,
  X_AXIS_HEIGHT,
  Y_TICK_SPACING,
  type ChartSeriesColor,
  type Rect,
} from '../Chart/chartModel';

/** One observation. Points with a non-finite `x` or `y` are skipped. */
export interface ScatterPoint {
  /** Horizontal value: a number, or a `Date` / epoch ms on a `'time'` axis. */
  x: number | Date;
  /** Vertical value. */
  y: number;
  /** Optional magnitude; dot area is proportional to it (scale from 0, small values floored at the min radius). Needs `formatSize` on the chart. */
  size?: number;
  /** Optional note shown in the tooltip, announcement and data table, e.g. "Big lunch". */
  label?: string;
}
/** A named group of points drawn in one palette colour and marker shape. */
export interface ScatterSeries {
  /** Stable identity, used by `hiddenSeries`. */
  key: string;
  /** Legend, tooltip, announcement and data-table name. */
  label: string;
  /** The points; order does not matter (the keyboard walks them by `x`). */
  points: ScatterPoint[];
  /** Pins a palette slot (1–8); series without it fill the free slots in order. */
  color?: ChartSeriesColor;
}
/** An app-computed dashed line (e.g. a recommended ratio), drawn through `points` sorted by `x`. */
export interface ScatterReference {
  /** Legend name of the line. */
  label: string;
  /** Points the line passes through, in data units. */
  points: { x: number | Date; y: number }[];
}
/** X-axis kind: `'number'` (linear) or `'time'` (x as `Date` or epoch ms). */
export type ScatterXScale = 'number' | 'time';

/** A point with finite coordinates and `x` as a number (epoch ms for a time axis). */
export interface ResolvedScatterPoint {
  x: number;
  y: number;
  size?: number;
  label?: string;
}
/** A series with its palette slot assigned and invalid points removed. */
export interface ResolvedScatterSeries {
  key: string;
  label: string;
  /** Palette slot 1..8. */
  slot: number;
  /** True when the slot is reused (more series than palette slots). */
  overflow: boolean;
  points: ResolvedScatterPoint[];
}

export interface ScatterDot {
  seriesKey: string;
  slot: number;
  /** Index into the resolved series' `points`. */
  index: number;
  cx: number;
  cy: number;
  r: number;
  datum: ResolvedScatterPoint;
}
export interface ScatterTick {
  value: number;
  pos: number;
  label: string;
}
/** Baseline of an axis title, in svg px. */
export interface ScatterTitlePos {
  x: number;
  y: number;
}
/** Geometry for one render; `dots` are in paint order (largest first). */
export interface ScatterLayout {
  plot: Rect;
  /** y title: above the plot, starting at the svg's left edge (text-anchor start). */
  yTitle: ScatterTitlePos;
  /** x title: under the x tick labels, ending at the plot's right edge (text-anchor end). */
  xTitle: ScatterTitlePos;
  /** Baseline of the x tick labels. */
  xTickBaseline: number;
  xTicks: ScatterTick[];
  yTicks: ScatterTick[];
  dots: ScatterDot[];
  referencePath?: string;
  trends: { seriesKey: string; slot: number; path: string }[];
}

export interface ScatterLayoutInput {
  series: ResolvedScatterSeries[];
  xScale: ScatterXScale;
  xDomain?: [number | Date, number | Date];
  yDomain?: [number, number];
  width: number;
  height: number;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  reference?: ScatterReference;
  trendLine?: boolean;
  /** Min and max dot radius for points with `size`. */
  sizeRange: [number, number];
  /** Domain of `size` values; pass `scatterSizeDomain(allSeries)` so hiding a series doesn't resize the rest. Defaults to `series`. */
  sizeDomain?: [number, number];
}

const validSize = (s: number | undefined): s is number => s !== undefined && Number.isFinite(s);

/**
 * `[0, max size]` over all points of `series`. The scale starts at 0, not the data minimum, so dot area stays
 * proportional to the value: 20 and 22 look nearly alike (DS-41). Negative sizes count as 0.
 */
export function scatterSizeDomain(series: readonly ResolvedScatterSeries[]): [number, number] {
  const sizes = series.flatMap((s) => s.points.map((p) => p.size).filter(validSize));
  return [0, Math.max(0, ...sizes)];
}

/** Height of one axis-title row (--font-size-sm line plus gap); one above the plot, one below the x ticks. */
const TITLE_ROW = 16;
/** Baseline of the y title below the svg top. */
const Y_TITLE_BASELINE = 12;

/** Space kept between the dot edge and the plot's domain bounds: the 1px ring. */
const DOT_RING = 1;

const num = (x: number | Date) => (x instanceof Date ? x.getTime() : x);

export function resolveScatterSeries(series: ScatterSeries[]): ResolvedScatterSeries[] {
  const slots = assignSlots(series.map((s) => s.color));
  return series.map((s, i) => ({
    key: s.key,
    label: s.label,
    ...slots[i],
    points: s.points
      .map((p) => ({ ...p, x: num(p.x) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  }));
}

/** Least-squares line, or null with fewer than 2 distinct x. */
export function linearFit(
  points: readonly { x: number; y: number }[],
): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  const sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const sxy = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** Keyboard walk order over the given (visible) series: by x, ties by series order then point index. */
export function inspectionOrder(
  series: readonly ResolvedScatterSeries[],
): { seriesKey: string; index: number }[] {
  return series
    .flatMap((s, si) => s.points.map((p, index) => ({ seriesKey: s.key, index, x: p.x, si })))
    .sort((a, b) => a.x - b.x || a.si - b.si || a.index - b.index)
    .map(({ seriesKey, index }) => ({ seriesKey, index }));
}

/** Closest dot centre within `maxDistance`; on equal distance the later-painted (smaller) dot wins. */
export function nearestDot(
  layout: ScatterLayout,
  px: number,
  py: number,
  maxDistance: number,
): ScatterDot | null {
  let best: ScatterDot | null = null;
  let bestD = maxDistance;
  for (const d of layout.dots) {
    const dist = Math.hypot(d.cx - px, d.cy - py);
    if (dist <= bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best;
}

const extent = (values: number[]): [number, number] =>
  values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
/** A single value (one point, or every point on one x/y) spans ±`pad` so the axis keeps readable ticks. */
const widen = ([lo, hi]: [number, number], pad = 1): [number, number] =>
  lo === hi ? [lo - pad, hi + pad] : [lo, hi];
const HOUR_MS = 3_600_000;

export function computeScatterLayout(input: ScatterLayoutInput): ScatterLayout {
  const { series, width, height, formatX, formatY } = input;
  const all = series.flatMap((s) => s.points);

  const plotTop = PAD_TOP + TITLE_ROW;
  const plotBottom = Math.max(plotTop + 1, height - X_AXIS_HEIGHT - TITLE_ROW);
  const yCount = Math.max(2, Math.floor((plotBottom - plotTop) / Y_TICK_SPACING));
  const y = scaleLinear().range([plotBottom, plotTop]);
  if (input.yDomain) y.domain(input.yDomain);
  else {
    const ys = all.map((p) => p.y);
    const [lo, hi] = widen(extent(ys));
    y.domain([lo >= 0 ? 0 : lo, hi]).nice(yCount);
  }
  const yValues = y.ticks(yCount);
  const yLabels = yValues.map(formatY);
  const left = Math.max(0, ...yLabels.map(estimateTextWidth)) + LABEL_GAP;
  const plot: Rect = {
    x: left,
    y: plotTop,
    width: Math.max(1, width - left - PAD_RIGHT),
    height: plotBottom - plotTop,
  };

  // Inset the pixel ranges by the largest dot so dots at the domain bounds stay inside the svg.
  const pad =
    (all.some((p) => validSize(p.size)) ? Math.max(input.sizeRange[1], DOT_RADIUS) : DOT_RADIUS) +
    DOT_RING;
  y.range([plotBottom - pad, plotTop + pad]);
  const xr: [number, number] = [plot.x + pad, plot.x + plot.width - pad];
  const xExtent = widen(extent(all.map((p) => p.x)), input.xScale === 'time' ? HOUR_MS : 1);
  const xd: [number, number] = input.xDomain
    ? [num(input.xDomain[0]), num(input.xDomain[1])]
    : xExtent;
  let x: (v: number) => number;
  let xValues: number[];
  const xCount = Math.max(2, Math.floor(plot.width / 80));
  if (input.xScale === 'time') {
    const s = scaleTime().domain(xd).range(xr);
    x = (v) => s(v);
    xValues = s.ticks(xCount).map((d) => d.getTime());
  } else {
    const s = scaleLinear().domain(xd).range(xr);
    if (!input.xDomain) s.nice(xCount);
    x = s;
    xValues = s.ticks(xCount);
  }
  // Drop ticks whose label would overflow the svg or collide with the previous kept one.
  const xTicks: ScatterTick[] = [];
  let prevEnd = -Infinity;
  for (const value of xValues) {
    const pos = x(value);
    const label = formatX(value);
    const half = estimateTextWidth(label) / 2;
    if (pos - half < 0 || pos + half > width || pos - half < prevEnd + LABEL_GAP) continue;
    xTicks.push({ value, pos, label });
    prevEnd = pos + half;
  }

  const [, sMax] = input.sizeDomain ?? scatterSizeDomain(series);
  const [rMin, rMax] = input.sizeRange;
  // Area ∝ value from 0; the min radius is only a floor so tiny / zero values stay visible and hoverable.
  const area = scaleSqrt().domain([0, sMax]).range([0, rMax]).clamp(true);
  const r = (v: number) => (sMax > 0 ? Math.max(rMin, area(Math.max(0, v))) : rMin);
  const dots: ScatterDot[] = series
    .flatMap((s) =>
      s.points.map((datum, index) => ({
        seriesKey: s.key,
        slot: s.slot,
        index,
        cx: x(datum.x),
        cy: y(datum.y),
        r: validSize(datum.size) ? r(datum.size) : DOT_RADIUS,
        datum,
      })),
    )
    .sort((a, b) => b.r - a.r); // stable: ties keep series/point order

  const referencePath = input.reference?.points.length
    ? input.reference.points
        .map((p) => ({ x: num(p.x), y: p.y }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .sort((a, b) => a.x - b.x)
        .map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`)
        .join('')
    : undefined;

  const trends: ScatterLayout['trends'] = [];
  if (input.trendLine)
    for (const s of series) {
      const fit = linearFit(s.points);
      if (!fit) continue;
      const [x0, x1] = extent(s.points.map((p) => p.x));
      const at = (v: number) => `${x(v)},${y(fit.slope * v + fit.intercept)}`;
      trends.push({ seriesKey: s.key, slot: s.slot, path: `M${at(x0)}L${at(x1)}` });
    }

  return {
    plot,
    yTitle: { x: 0, y: Y_TITLE_BASELINE },
    xTitle: { x: plot.x + plot.width, y: height - X_LABEL_BASELINE },
    xTickBaseline: height - X_LABEL_BASELINE - TITLE_ROW,
    xTicks,
    yTicks: yValues.map((value, i) => ({ value, pos: y(value), label: yLabels[i] })),
    dots,
    referencePath,
    trends,
  };
}
