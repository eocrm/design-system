import { scaleLinear } from 'd3-scale';
import { area, line, stack, stackOffsetDiverging, stackOffsetNone, type Series } from 'd3-shape';

/** Chart form. `area` is always stacked. */
export type ChartType = 'line' | 'bar' | 'stacked-bar' | 'area';

/** One plotted series. `values[i]` belongs to `categories[i]`; `null` is a gap. */
export interface ChartSeries {
  key: string;
  label: string;
  values: (number | null)[];
  comparisonOf?: string;
}

/** Distinct categorical colours; series past this reuse the palette with a dashed/outlined overflow style. */
export const PALETTE_SIZE = 8;
// ponytail: estimated glyph width at --font-size-sm (12px) instead of measuring text;
// measure with canvas.measureText if labels clip or overlap in real fonts.
export const CHAR_WIDTH = 7;
export const LABEL_GAP = 8;
/** Distance of the x-label baseline from the svg bottom edge. */
export const X_LABEL_BASELINE = 4;
/** Radius of the isolated-point dots. */
export const DOT_RADIUS = 3;
export const MARKER_RADIUS = 4;
/** Below this root height the legend collapses to one row with a "+N" counter. */
export const COMPACT_HEIGHT = 120;

const MARK_GAP = 2;
const BAR_RADIUS = 4;
const BAND_RATIO = 0.65;
const PAD_TOP = 8;
const PAD_RIGHT = 8;
const X_AXIS_HEIGHT = 20;
const Y_TICK_SPACING = 40;
const LEGEND_ITEM_EXTRA = 28; // swatch + gaps around one legend item
const LEGEND_MORE_WIDTH = 4 * CHAR_WIDTH; // "+NN"

export function isStacked(type: ChartType): boolean {
  return type === 'stacked-bar' || type === 'area';
}

export interface ResolvedSeries {
  key: string;
  label: string;
  values: (number | null)[];
  /** Palette slot 1..8; 0 = neutral (a `'total'` comparison). */
  slot: number;
  /** True when the slot is reused (primary index ≥ 8). */
  overflow: boolean;
  /** Parent key, `'total'`, or undefined for a primary series. */
  comparisonOf?: string;
}

export interface ResolveResult {
  series: ResolvedSeries[];
  dropped: string[];
  overflowCount: number;
}

const fit = (values: readonly (number | null)[], length: number) =>
  Array.from({ length }, (_, i) => (Number.isFinite(values[i]) ? (values[i] as number) : null));

export function resolveSeries(
  type: ChartType,
  input: readonly ChartSeries[],
  length: number,
): ResolveResult {
  const stacked = isStacked(type);
  const primaries = input.filter((x) => x.comparisonOf === undefined);
  const primaryKeys = new Set(primaries.map((x) => x.key));
  const dropped: string[] = [];
  const byParent = new Map<string, ChartSeries[]>();
  const totals: ChartSeries[] = [];

  for (const c of input) {
    if (c.comparisonOf === undefined) continue;
    if (c.comparisonOf === 'total') {
      if (stacked) totals.push(c);
      else dropped.push(c.key);
    } else if (stacked || !primaryKeys.has(c.comparisonOf)) {
      dropped.push(c.key);
    } else {
      byParent.set(c.comparisonOf, [...(byParent.get(c.comparisonOf) ?? []), c]);
    }
  }

  const series: ResolvedSeries[] = [];
  primaries.forEach((p, i) => {
    const slot = (i % PALETTE_SIZE) + 1;
    const overflow = i >= PALETTE_SIZE;
    series.push({ key: p.key, label: p.label, values: fit(p.values, length), slot, overflow });
    for (const c of byParent.get(p.key) ?? []) {
      series.push({
        key: c.key,
        label: c.label,
        values: fit(c.values, length),
        slot,
        overflow,
        comparisonOf: p.key,
      });
    }
  });
  for (const c of totals) {
    series.push({
      key: c.key,
      label: c.label,
      values: fit(c.values, length),
      slot: 0,
      overflow: false,
      comparisonOf: 'total',
    });
  }
  return { series, dropped, overflowCount: Math.max(0, primaries.length - PALETTE_SIZE) };
}

export function visibleSeries(
  series: readonly ResolvedSeries[],
  hidden: readonly string[],
): ResolvedSeries[] {
  const h = new Set(hidden);
  return series.filter(
    (x) =>
      !h.has(x.key) &&
      !(x.comparisonOf !== undefined && x.comparisonOf !== 'total' && h.has(x.comparisonOf)),
  );
}

export function isEmpty(categories: readonly string[], series: readonly ResolvedSeries[]): boolean {
  return (
    categories.length === 0 || series.every((x) => x.values.every((v) => v === null || v === 0))
  );
}

const textWidth = (text: string) => text.length * CHAR_WIDTH;

/** Indices of the x labels to draw so none overlap; first always kept, last kept when it fits. */
export function thinLabels(categories: readonly string[], step: number): number[] {
  const n = categories.length;
  if (n === 0) return [];
  const labelWidth = Math.max(...categories.map(textWidth)) + LABEL_GAP;
  const every = Math.max(1, Math.ceil(labelWidth / step));
  const kept: number[] = [];
  for (let i = 0; i < n; i += every) kept.push(i);
  const last = n - 1;
  if (kept[kept.length - 1] !== last) {
    while (kept.length > 1 && (last - kept[kept.length - 1]) * step < labelWidth) kept.pop();
    if ((last - kept[kept.length - 1]) * step >= labelWidth) kept.push(last);
  }
  return kept;
}

/** How many legend items fit on one row of `width`, leaving room for a "+N" counter. At least 1. */
export function fitLegend(labels: readonly string[], width: number): number {
  let used = 0;
  for (let i = 0; i < labels.length; i++) {
    const w = textWidth(labels[i]) + LEGEND_ITEM_EXTRA;
    const reserve = i === labels.length - 1 ? 0 : LEGEND_MORE_WIDTH;
    if (used + w + reserve > width) return Math.max(1, i);
    used += w;
  }
  return labels.length;
}

export type BarEnd = 'top' | 'bottom' | null;
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

/** SVG path for a bar with a rounded data end (`top` for positive, `bottom` for negative). */
export function barPath({ x, y, width, height }: Rect, end: BarEnd): string {
  const r = end ? Math.min(BAR_RADIUS, width / 2, height) : 0;
  if (r === 0) return `M${x},${y}h${width}v${height}h${-width}Z`;
  const right = x + width;
  const bottom = y + height;
  if (end === 'top') {
    return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${right - r}Q${right},${y} ${right},${y + r}V${bottom}Z`;
  }
  return `M${x},${y}H${right}V${bottom - r}Q${right},${bottom} ${right - r},${bottom}H${x + r}Q${x},${bottom} ${x},${bottom - r}Z`;
}

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';
const SHAPES: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond'];

/** Marker shape per palette slot, so identity never relies on colour alone. */
export function markerShape(slot: number): MarkerShape {
  return SHAPES[(Math.max(1, slot) - 1) % SHAPES.length];
}

export function markerPath(shape: MarkerShape, x: number, y: number, r: number): string {
  switch (shape) {
    case 'square':
      return `M${x - r},${y - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
    case 'triangle':
      return `M${x},${y - r}L${x + r},${y + r}L${x - r},${y + r}Z`;
    case 'diamond':
      return `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z`;
    default:
      return `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
  }
}

export interface SeriesMarks {
  key: string;
  slot: number;
  overflow: boolean;
  comparison: boolean;
  kind: 'line' | 'area' | 'bars';
  line?: string;
  area?: string;
  /** One path per category; `null` where the bar is absent (null or zero). */
  bars?: (string | null)[];
  /** Active-category anchor per category (top of the mark); `null` at gaps. */
  points: (Point | null)[];
  /** Isolated points that a line/area cannot draw. */
  dots: Point[];
}

export interface LayoutInput {
  type: ChartType;
  categories: readonly string[];
  /** Visible series only, in `resolveSeries` order. */
  series: readonly ResolvedSeries[];
  width: number;
  height: number;
  formatValue: (n: number) => string;
}

export interface ChartLayout {
  plot: Rect;
  yTicks: { value: number; y: number; label: string }[];
  xLabels: { index: number; x: number; label: string }[];
  /** Centre x of each category, in svg coordinates. */
  categoryX: number[];
  step: number;
  bandWidth: number;
  marks: SeriesMarks[];
}

type StackRow = Record<string, number>;

const isolated = (values: readonly (number | null)[], i: number) =>
  values[i] !== null && (values[i - 1] ?? null) === null && (values[i + 1] ?? null) === null;

export function computeLayout(input: LayoutInput): ChartLayout {
  const { type, categories, series, width, height, formatValue } = input;
  const n = categories.length;
  const stacked = isStacked(type);
  const primaries = series.filter((x) => x.comparisonOf === undefined);
  const comparisons = series.filter((x) => x.comparisonOf !== undefined);

  const layers: Series<StackRow, string>[] | null = stacked
    ? stack<StackRow, string>()
        .keys(primaries.map((p) => p.key))
        .value((row, key) => row[key])
        .offset(type === 'area' ? stackOffsetNone : stackOffsetDiverging)(
        Array.from({ length: n }, (_, i) =>
          Object.fromEntries(primaries.map((p) => [p.key, p.values[i] ?? 0])),
        ),
      )
    : null;

  let min = 0;
  let max = 0;
  const take = (v: number | null) => {
    if (v === null || Number.isNaN(v)) return;
    if (v < min) min = v;
    if (v > max) max = v;
  };
  if (layers)
    for (const layer of layers)
      for (const [y0, y1] of layer) {
        take(y0);
        take(y1);
      }
  else for (const p of primaries) p.values.forEach(take);
  for (const c of comparisons) c.values.forEach(take);
  if (min === max) max = min + 1;

  const plotTop = PAD_TOP;
  const plotBottom = Math.max(plotTop + 1, height - X_AXIS_HEIGHT);
  const tickCount = Math.max(2, Math.floor((plotBottom - plotTop) / Y_TICK_SPACING));
  const y = scaleLinear().domain([min, max]).range([plotBottom, plotTop]).nice(tickCount);
  const tickValues = y.ticks(tickCount);
  const tickLabels = tickValues.map(formatValue);
  const left = Math.max(0, ...tickLabels.map(textWidth)) + LABEL_GAP;
  const plot: Rect = {
    x: left,
    y: plotTop,
    width: Math.max(1, width - left - PAD_RIGHT),
    height: plotBottom - plotTop,
  };
  const step = plot.width / Math.max(1, n);
  const bandWidth = step * BAND_RATIO;
  const categoryX = categories.map((_, i) => plot.x + step * (i + 0.5));
  const zeroY = y(0);

  const yTicks = tickValues.map((value, i) => ({ value, y: y(value), label: tickLabels[i] }));
  // Clamp end labels inside the svg, then drop any label the clamping made collide.
  const boxes = thinLabels(categories, step).map((index) => {
    const half = textWidth(categories[index]) / 2;
    const x = Math.min(Math.max(categoryX[index], half), Math.max(half, width - half));
    return { index, x, label: categories[index], half };
  });
  const hits = (a: (typeof boxes)[number], b: (typeof boxes)[number]) =>
    b.x - b.half < a.x + a.half + LABEL_GAP;
  const xLabels: typeof boxes = [];
  boxes.forEach((b, i) => {
    if (i === boxes.length - 1 && i > 0) {
      while (xLabels.length > 1 && hits(xLabels[xLabels.length - 1], b)) xLabels.pop();
    }
    if (xLabels.length === 0 || !hits(xLabels[xLabels.length - 1], b)) xLabels.push(b);
  });

  const linePath = (values: readonly (number | null)[]) =>
    line<number | null>()
      .defined((v) => v !== null)
      .x((_, i) => categoryX[i])
      .y((v) => y(v as number))(values as (number | null)[]) ?? '';
  const pointsOf = (values: readonly (number | null)[]) =>
    values.map((v, i) => (v === null ? null : { x: categoryX[i], y: y(v) }));
  const dotsOf = (values: readonly (number | null)[], points: (Point | null)[]) =>
    values.flatMap((_, i) => (isolated(values, i) ? [points[i] as Point] : []));
  const base = (x: ResolvedSeries) => ({
    key: x.key,
    slot: x.slot,
    overflow: x.overflow,
    comparison: x.comparisonOf !== undefined,
  });

  const lineMarks = (x: ResolvedSeries): SeriesMarks => {
    const points = pointsOf(x.values);
    return {
      ...base(x),
      kind: 'line',
      line: linePath(x.values),
      points,
      dots: dotsOf(x.values, points),
    };
  };

  const marks: SeriesMarks[] = [];

  if (type === 'line') {
    for (const x of series) marks.push(lineMarks(x));
  } else if (type === 'bar') {
    const groups = series.length;
    const barWidth = Math.max(1, (bandWidth - MARK_GAP * (groups - 1)) / groups);
    series.forEach((x, j) => {
      const bars = x.values.map((v, i) => {
        if (v === null || v === 0) return null;
        const bx = categoryX[i] - bandWidth / 2 + j * (barWidth + MARK_GAP);
        const top = Math.min(y(v), zeroY);
        const h = Math.max(1, Math.abs(zeroY - y(v)));
        return barPath({ x: bx, y: top, width: barWidth, height: h }, v > 0 ? 'top' : 'bottom');
      });
      marks.push({ ...base(x), kind: 'bars', bars, points: pointsOf(x.values), dots: [] });
    });
  } else if (layers) {
    const posTotal = categories.map((_, i) => Math.max(0, ...layers.map((l) => l[i][1])));
    const negTotal = categories.map((_, i) => Math.min(0, ...layers.map((l) => l[i][0])));
    primaries.forEach((x, j) => {
      const layer = layers[j];
      const points = x.values.map((v, i) =>
        v === null ? null : { x: categoryX[i], y: y(v >= 0 ? layer[i][1] : layer[i][0]) },
      );
      if (type === 'stacked-bar') {
        const bars = x.values.map((v, i) => {
          if (v === null || v === 0) return null;
          const [y0, y1] = layer[i];
          let top = y(Math.max(y0, y1));
          let bottom = y(Math.min(y0, y1));
          if (v > 0 && y0 !== 0) bottom -= MARK_GAP;
          if (v < 0 && y1 !== 0) top += MARK_GAP;
          const end: BarEnd =
            v > 0 && y1 === posTotal[i] ? 'top' : v < 0 && y0 === negTotal[i] ? 'bottom' : null;
          return barPath(
            {
              x: categoryX[i] - bandWidth / 2,
              y: top,
              width: bandWidth,
              height: Math.max(1, bottom - top),
            },
            end,
          );
        });
        marks.push({ ...base(x), kind: 'bars', bars, points, dots: [] });
      } else {
        const defined = (_: unknown, i: number) => x.values[i] !== null;
        const areaPath =
          area<[number, number]>()
            .defined(defined)
            .x((_, i) => categoryX[i])
            .y0((d) => y(d[0]))
            .y1((d) => y(d[1]))(layer as unknown as [number, number][]) ?? '';
        const topLine =
          line<[number, number]>()
            .defined(defined)
            .x((_, i) => categoryX[i])
            .y((d) => y(d[1]))(layer as unknown as [number, number][]) ?? '';
        marks.push({
          ...base(x),
          kind: 'area',
          area: areaPath,
          line: topLine,
          points,
          dots: dotsOf(x.values, points),
        });
      }
    });
    for (const c of comparisons) marks.push(lineMarks(c));
  }

  return {
    plot,
    yTicks,
    xLabels: xLabels.map(({ index, x, label }) => ({ index, x, label })),
    categoryX,
    step,
    bandWidth,
    marks,
  };
}

/** Category index under svg x coordinate `x`, clamped to the data (0 when there are no categories). */
export function categoryIndexAt(layout: ChartLayout, x: number): number {
  const n = layout.categoryX.length;
  return Math.max(0, Math.min(n - 1, Math.max(0, Math.floor((x - layout.plot.x) / layout.step))));
}
