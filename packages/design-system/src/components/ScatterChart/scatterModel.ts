import { line } from 'd3-shape';
import { scaleLinear, scaleSqrt, scaleTime } from 'd3-scale';
import {
  assignSlots,
  DOT_RADIUS,
  estimateTextWidth,
  LABEL_GAP,
  MARKER_RADIUS,
  markerPath,
  markerShape,
  type MarkerShape,
  PAD_RIGHT,
  X_LABEL_BASELINE,
  PAD_TOP,
  REFERENCE_DASHES,
  X_AXIS_HEIGHT,
  Y_TICK_SPACING,
  type ChartSeriesColor,
  type Rect,
} from '../Chart/chartModel';

export { markerPath };

/** Marker shape of a series' points. */
export type ScatterMarkerShape = 'circle' | 'square' | 'triangle';

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
  /**
   * Marker shape of every point and of the legend swatch, so a series is told apart without colour (e.g. a square for
   * "poo" next to circles for meals). Default: the palette slot's own shape.
   */
  shape?: ScatterMarkerShape;
  /**
   * `'strong'` draws unsized points larger (`--scatter-dot-strong`) with a thicker surface-coloured ring so they read
   * over other dots and reference lines; sized points keep their size scale and get the ring. Default `'default'`.
   */
  emphasis?: 'default' | 'strong';
  /**
   * Draws a solid line in the series colour through its visible points, sorted by `x`, under the dots. Decorative
   * (the legend, tooltip, keyboard and table stay per point). `{ maxGap }` breaks the line between neighbours whose
   * `x` distance exceeds it (x units; ms on a `'time'` axis). Default `false`.
   */
  connect?: boolean | { maxGap: number };
}
/** An app-computed dashed line (e.g. a recommended ratio), drawn through `points` sorted by `x`. */
export interface ScatterReference {
  /** Identity of the line (React key, legend entry). Defaults to its index. */
  key?: string;
  /** Legend name of the line. */
  label: string;
  /** Points the line passes through, in data units. */
  points: { x: number | Date; y: number }[];
  /** Pins a palette slot (1–8); default is neutral ink. */
  color?: ChartSeriesColor;
  /**
   * `'strong'` draws the line at `--chart-reference-width-strong` so one line stands out, e.g. today's pace over the
   * usual. Default `'default'`.
   */
  emphasis?: 'default' | 'strong';
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
  /** Explicit `shape`; undefined = the slot's shape. */
  shape?: ScatterMarkerShape;
  strong: boolean;
  connect?: boolean | { maxGap: number };
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
  /** Marker shape: the series' `shape`, else the slot's. */
  shape: MarkerShape;
  /** The series has `emphasis: 'strong'`. */
  strong: boolean;
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
  /** The drawn x range (after nice-rounding), epoch ms on a time axis. */
  xDomain: [number, number];
  /** Svg x of an x value. */
  xPos: (v: number) => number;
  dots: ScatterDot[];
  /** One entry per reference line with points: its key, path, dash pattern index and palette slot (0 = neutral ink). */
  references: { key: string; path: string; dash: number; slot: number; emphasis?: 'strong' }[];
  trends: { seriesKey: string; slot: number; path: string }[];
  /** One entry per connected segment of a `connect` series, in series order. */
  connects: { seriesKey: string; slot: number; path: string }[];
  /** With `stems`, one path per series with points: a vertical segment per dot from y = 0 (clamped to the plot) to the dot. */
  stems: { seriesKey: string; slot: number; path: string }[];
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
  reference?: ScatterReference | ScatterReference[];
  trendLine?: boolean;
  /** Build `stems`: a vertical line from y = 0 (or the nearest plot edge) to each dot. */
  stems?: boolean;
  /** Min and max dot radius for points with `size`; the max also shrinks to 1/25 of the chart width. */
  sizeRange: [number, number];
  /** Domain of `size` values; pass `scatterSizeDomain(allSeries)` so hiding a series doesn't resize the rest. Defaults to `series`. */
  sizeDomain?: [number, number];
  /** Radius of unsized dots of an `emphasis: 'strong'` series. Default `2 * DOT_RADIUS + 2`. */
  strongRadius?: number;
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
/**
 * Largest dot radius as a share of the chart's width (DS-68): a phone-width chart (~250px) caps
 * sized dots at a 10px radius instead of the token's 16px, so they stop overlapping their
 * neighbours. Width only, so a short wide desktop card keeps the token size; and the input width,
 * not the plot's, which moves with the y-tick labels when a legend toggle hides a series.
 */
const MAX_DOT_SHARE = 1 / 25;

/** Fallback for `--scatter-dot-strong` (`--space-2`) where computed styles don't resolve (jsdom). */
const STRONG_RADIUS = 8;

const num = (x: number | Date) => (x instanceof Date ? x.getTime() : x);

export function resolveScatterSeries(series: ScatterSeries[]): ResolvedScatterSeries[] {
  const slots = assignSlots(series.map((s) => s.color));
  return series.map((s, i) => ({
    key: s.key,
    label: s.label,
    ...slots[i],
    shape: s.shape,
    strong: s.emphasis === 'strong',
    connect: s.connect,
    points: s.points
      .map((p) => ({ ...p, x: num(p.x) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  }));
}

/**
 * Points sorted by `x` and split into runs where neighbours are at most `maxGap` apart (no split without it).
 * Runs of one point are dropped: nothing to draw.
 */
export function connectSegments<T extends { x: number; y: number }>(
  points: readonly T[],
  maxGap?: number,
): T[][] {
  const segments: T[][] = [];
  let run: T[] = [];
  for (const p of [...points].sort((a, b) => a.x - b.x)) {
    if (run.length && maxGap !== undefined && p.x - run[run.length - 1].x > maxGap) {
      segments.push(run);
      run = [];
    }
    run.push(p);
  }
  segments.push(run);
  return segments.filter((r) => r.length > 1);
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

  const [rMin, tokenMax] = input.sizeRange;
  const rMax = Math.max(rMin, Math.min(tokenMax, width * MAX_DOT_SHARE));
  // Inset the pixel ranges by the largest dot's hover ring (radius + 1, see ScatterChart's marker)
  // so neither a dot nor its ring at the domain bounds is clipped by the plot (DS-68).
  const strongR = input.strongRadius ?? STRONG_RADIUS;
  const largest = Math.max(
    all.some((p) => validSize(p.size)) ? Math.max(rMax, DOT_RADIUS) : DOT_RADIUS,
    series.some((s) => s.strong) ? strongR : 0,
  );
  const pad = Math.max(largest, MARKER_RADIUS) + 1 + DOT_RING;
  y.range([plotBottom - pad, plotTop + pad]);
  const xr: [number, number] = [plot.x + pad, plot.x + plot.width - pad];
  const xExtent = widen(extent(all.map((p) => p.x)), input.xScale === 'time' ? HOUR_MS : 1);
  const xd: [number, number] = input.xDomain
    ? [num(input.xDomain[0]), num(input.xDomain[1])]
    : xExtent;
  let x: (v: number) => number;
  let xValues: number[];
  let xDomain = xd;
  const xCount = Math.max(2, Math.floor(plot.width / 80));
  if (input.xScale === 'time') {
    const s = scaleTime().domain(xd).range(xr);
    x = (v) => s(v);
    xValues = s.ticks(xCount).map((d) => d.getTime());
  } else {
    const s = scaleLinear().domain(xd).range(xr);
    if (!input.xDomain) s.nice(xCount);
    x = s;
    xDomain = s.domain() as [number, number];
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
        r: validSize(datum.size) ? r(datum.size) : s.strong ? strongR : DOT_RADIUS,
        shape: s.shape ?? markerShape(s.slot),
        strong: s.strong,
        datum,
      })),
    )
    .sort((a, b) => b.r - a.r); // stable: ties keep series/point order

  const references = [input.reference ?? []].flat().flatMap((r, i) =>
    r.points.length
      ? [
          {
            key: r.key ?? String(i),
            path: r.points
              .map((p) => ({ x: num(p.x), y: p.y }))
              .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
              .sort((a, b) => a.x - b.x)
              .map((p, j) => `${j ? 'L' : 'M'}${x(p.x)},${y(p.y)}`)
              .join(''),
            dash: i % REFERENCE_DASHES,
            slot: r.color ?? 0,
            emphasis: r.emphasis === 'strong' ? ('strong' as const) : undefined,
          },
        ]
      : [],
  );

  const trends: ScatterLayout['trends'] = [];
  if (input.trendLine)
    for (const s of series) {
      const fit = linearFit(s.points);
      if (!fit) continue;
      const [x0, x1] = extent(s.points.map((p) => p.x));
      const at = (v: number) => `${x(v)},${y(fit.slope * v + fit.intercept)}`;
      trends.push({ seriesKey: s.key, slot: s.slot, path: `M${at(x0)}L${at(x1)}` });
    }

  const connects: ScatterLayout['connects'] = [];
  const toPath = line<{ x: number; y: number }>()
    .x((p) => x(p.x))
    .y((p) => y(p.y));
  for (const s of series) {
    if (!s.connect) continue;
    const maxGap = typeof s.connect === 'object' ? s.connect.maxGap : undefined;
    for (const seg of connectSegments(s.points, maxGap))
      connects.push({ seriesKey: s.key, slot: s.slot, path: toPath(seg)! });
  }

  const stems: ScatterLayout['stems'] = [];
  if (input.stems) {
    // y = 0, clamped to the plot so a range that excludes 0 starts at its nearest edge.
    const baseline = Math.min(plotBottom, Math.max(plotTop, y(0)));
    for (const s of series) {
      const own = dots.filter((d) => d.seriesKey === s.key);
      if (own.length === 0) continue;
      const path = own.map((d) => `M${d.cx},${baseline}V${d.cy}`).join('');
      stems.push({ seriesKey: s.key, slot: s.slot, path });
    }
  }

  return {
    plot,
    yTitle: { x: 0, y: Y_TITLE_BASELINE },
    xTitle: { x: plot.x + plot.width, y: height - X_LABEL_BASELINE },
    xTickBaseline: height - X_LABEL_BASELINE - TITLE_ROW,
    xTicks,
    yTicks: yValues.map((value, i) => ({ value, pos: y(value), label: yLabels[i] })),
    xDomain,
    xPos: x,
    dots,
    references,
    trends,
    connects,
    stems,
  };
}
