import { scaleLinear } from 'd3-scale';
import {
  LABEL_GAP,
  X_AXIS_HEIGHT,
  X_LABEL_BASELINE,
  estimateTextWidth,
  thinLabels,
} from '../Chart/chartModel';

/** Ramp step of a bucket: `--heatmap-step-N`. */
export type HeatmapStep = 1 | 2 | 3 | 4 | 5;

export interface HeatmapBuckets {
  /**
   * Bucket edges, one more than buckets: bucket `i` holds `[thresholds[i], thresholds[i + 1])`, the last one
   * closed. Integer data that fits five buckets gets one per integer, the last edge repeating the max.
   */
  thresholds: number[];
  /** Ramp step of each bucket. */
  steps: HeatmapStep[];
  /** Every finite value is an integer; legend ranges are then closed integer ranges ("2–3"). */
  integer: boolean;
}

const MAX_BUCKETS = 5;
/** Fewer buckets keep the ramp ends and spread the rest evenly. */
const SPREAD: Record<number, HeatmapStep[]> = {
  1: [3],
  2: [1, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

/** Edges of d3's nice ticks over [min, max], at most five buckets (a lower tick count until it fits). */
function niceEdges(min: number, max: number): number[] {
  for (let count = MAX_BUCKETS; count > 1; count--) {
    const edges = scaleLinear().domain([min, max]).nice(count).ticks(count);
    if (edges.length - 1 <= MAX_BUCKETS && edges[0] <= min && edges[edges.length - 1] >= max)
      return edges;
  }
  return scaleLinear().domain([min, max]).nice(1).ticks(1);
}

/** Buckets over the finite values of `values`; `null` when there is none. */
export function heatmapBuckets(
  values: readonly (readonly (number | null)[])[],
): HeatmapBuckets | null {
  const finite = values.flat().filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const v of finite) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const integer = finite.every(Number.isInteger);
  let thresholds: number[];
  if (min === max) thresholds = [min, max];
  else if (integer && max - min + 1 <= MAX_BUCKETS)
    thresholds = [...Array.from({ length: max - min + 1 }, (_, i) => min + i), max];
  else thresholds = niceEdges(min, max);
  return { thresholds, steps: SPREAD[thresholds.length - 1], integer };
}

/** Index into `b.steps` of the bucket holding `value` (clamped to the first / last bucket). */
export function bucketOf(value: number, b: HeatmapBuckets): number {
  const n = b.steps.length;
  let i = 0;
  while (i < n - 1 && value >= b.thresholds[i + 1]) i++;
  return i;
}

/** One legend swatch per bucket with its range via `formatValue` (a single value when the bucket holds one). */
export function legendEntries(
  b: HeatmapBuckets,
  formatValue: (n: number) => string,
): { step: HeatmapStep; text: string }[] {
  const n = b.steps.length;
  return b.steps.map((step, i) => {
    const lo = b.thresholds[i];
    const next = b.thresholds[i + 1];
    // Integer buckets are closed ranges: the next bucket starts one after this one ends.
    const hi = b.integer && i < n - 1 ? next - 1 : next;
    const text = lo === hi ? formatValue(lo) : `${formatValue(lo)}–${formatValue(hi)}`;
    return { step, text };
  });
}

// ponytail: fixed cell-height clamp; cells stay square-ish without a parent height. Read tokens if themes need it.
const CELL_MIN_HEIGHT = 16;
const CELL_MAX_HEIGHT = 40;

export interface HeatmapLayout {
  /** Top-left of the cell grid. */
  plot: { x: number; y: number };
  cellWidth: number;
  cellHeight: number;
  /** Total svg height: grid plus the column-label band. */
  height: number;
  /** Row-label anchors (text-anchor end, vertically centred). */
  rowLabels: { index: number; x: number; y: number }[];
  /** Column labels kept after thinning (text-anchor middle, baseline `y`). */
  columnLabels: { index: number; x: number; y: number }[];
  /** Cell under a point relative to the svg, or `null` outside the grid. */
  cellAt(x: number, y: number): { row: number; col: number } | null;
}

/** Cell grid filling `width`: row labels on the left, thinned column labels underneath. */
export function computeHeatmapLayout({
  rows,
  columns,
  width,
}: {
  rows: readonly string[];
  columns: readonly string[];
  width: number;
}): HeatmapLayout {
  const plotX = Math.max(0, ...rows.map(estimateTextWidth)) + LABEL_GAP;
  const avail = Math.max(1, width - plotX);
  // The last column label is centred on its cell; keep its right half inside the svg.
  const lastHalf = columns.length ? estimateTextWidth(columns[columns.length - 1]) / 2 : 0;
  const roughCell = avail / Math.max(1, columns.length);
  const padRight = Math.max(0, lastHalf - roughCell / 2);
  const cellWidth = Math.max(1, (avail - padRight) / Math.max(1, columns.length));
  const cellHeight = Math.min(CELL_MAX_HEIGHT, Math.max(CELL_MIN_HEIGHT, cellWidth));
  const plotY = 0;
  const gridBottom = plotY + cellHeight * rows.length;
  const height = gridBottom + X_AXIS_HEIGHT;
  return {
    plot: { x: plotX, y: plotY },
    cellWidth,
    cellHeight,
    height,
    rowLabels: rows.map((_, index) => ({
      index,
      x: plotX - LABEL_GAP,
      y: plotY + (index + 0.5) * cellHeight,
    })),
    columnLabels: thinLabels(columns, cellWidth).map((index) => ({
      index,
      x: plotX + (index + 0.5) * cellWidth,
      y: height - X_LABEL_BASELINE,
    })),
    cellAt(x, y) {
      const col = Math.floor((x - plotX) / cellWidth);
      const row = Math.floor((y - plotY) / cellHeight);
      if (x < plotX || y < plotY || col >= columns.length || row >= rows.length) return null;
      return { row, col };
    },
  };
}
