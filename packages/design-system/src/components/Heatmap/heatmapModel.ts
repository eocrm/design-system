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
   * Bucket edges, one more than buckets, clamped to the data: the first is the min, the last the max. Bucket `i`
   * holds `[thresholds[i], thresholds[i + 1])`, the last one closed. Integer data that fits five buckets gets one per
   * integer, the last edge repeating the max.
   */
  thresholds: number[];
  /** Ramp step of each bucket. */
  steps: HeatmapStep[];
  /**
   * Every finite value is an integer and the ranges stay distinct once formatted; the legend then lists disjoint
   * closed ranges ("0–1", "2–3"). Otherwise it is a stepped bar.
   */
  integer: boolean;
}

/**
 * What the legend draws. `ranges`: one swatch per bucket with its value or closed integer range. `scale`: a stepped
 * colour bar, `boundaries[0]` before the first swatch, `boundaries[i]` between swatches `i - 1` and `i`, the last
 * after the last swatch, so no value is printed twice.
 */
export type HeatmapLegend =
  | { kind: 'ranges'; items: { step: HeatmapStep; text: string }[] }
  | { kind: 'scale'; steps: HeatmapStep[]; boundaries: string[] };

const MAX_BUCKETS = 5;
/** Fewer buckets keep the ramp ends and spread the rest evenly. */
const SPREAD: Record<number, HeatmapStep[]> = {
  1: [3],
  2: [1, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

type Format = (n: number) => string;

/**
 * `formatValue` for legend text: -0, and a negative value that rounds to zero ("-0"), print as zero does, so a
 * legend can't show both "-0" and "0".
 */
function legendFormat(formatValue: Format): Format {
  const zero = formatValue(0);
  return (v) => {
    const s = formatValue(v === 0 ? 0 : v);
    return v < 0 && formatValue(-v) === zero ? zero : s;
  };
}

/**
 * d3's nice ticks over [min, max] with the ends clamped to the data: at most five buckets, every boundary distinct
 * after `fmt` (a lower tick count until both hold). Falls back to one bucket `[min, max]`.
 */
function niceEdges(min: number, max: number, fmt: Format): number[] {
  for (let count = MAX_BUCKETS; count >= 1; count--) {
    const ticks = scaleLinear().domain([min, max]).nice(count).ticks(count);
    if (ticks.length < 2 || ticks.length - 1 > MAX_BUCKETS) continue;
    if (ticks[0] > min || ticks[ticks.length - 1] < max) continue;
    const edges = [min, ...ticks.slice(1, -1), max];
    if (new Set(edges.map(fmt)).size === edges.length) return edges;
  }
  return [min, max];
}

/** Closed integer range of each bucket: the next starts one after this one ends; the last ends at the max. */
function integerRanges(thresholds: number[]): [number, number][] {
  const n = thresholds.length - 1;
  return Array.from({ length: n }, (_, i) => [
    thresholds[i],
    i < n - 1 ? thresholds[i + 1] - 1 : thresholds[n],
  ]);
}

/** Integer range labels stay apart once formatted: no "0k–0k", no "…–200" followed by "200–…". */
function rangesReadable(thresholds: number[], fmt: Format): boolean {
  const ranges = integerRanges(thresholds);
  return ranges.every(
    ([lo, hi], i) =>
      (lo === hi || fmt(lo) !== fmt(hi)) && (i === 0 || fmt(ranges[i - 1][1]) !== fmt(lo)),
  );
}

/** Buckets over the finite values of `values`; `null` when there is none. */
export function heatmapBuckets(
  values: readonly (readonly (number | null)[])[],
  formatValue: Format,
): HeatmapBuckets | null {
  const finite = values.flat().filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const v of finite) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const fmt = legendFormat(formatValue);
  let integer = finite.every(Number.isInteger);
  let thresholds: number[];
  if (min === max) thresholds = [min, max];
  else if (integer && max - min + 1 <= MAX_BUCKETS)
    thresholds = [...Array.from({ length: max - min + 1 }, (_, i) => min + i), max];
  else thresholds = niceEdges(min, max, fmt);
  // A formatter coarser than the integer ranges would make them look overlapping: use the stepped bar instead.
  if (integer && min !== max && !rangesReadable(thresholds, fmt)) {
    integer = false;
    thresholds = niceEdges(min, max, fmt);
  }
  return { thresholds, steps: SPREAD[thresholds.length - 1], integer };
}

/** Index into `b.steps` of the bucket holding `value` (clamped to the first / last bucket). */
export function bucketOf(value: number, b: HeatmapBuckets): number {
  const n = b.steps.length;
  let i = 0;
  while (i < n - 1 && value >= b.thresholds[i + 1]) i++;
  return i;
}

/** Legend for `b`: disjoint ranges for integer data, a stepped bar with boundary values otherwise. */
export function heatmapLegend(b: HeatmapBuckets, formatValue: Format): HeatmapLegend {
  const fmt = legendFormat(formatValue);
  if (b.integer) {
    return {
      kind: 'ranges',
      items: integerRanges(b.thresholds).map(([lo, hi], i) => ({
        step: b.steps[i],
        text: lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`,
      })),
    };
  }
  const boundaries = b.thresholds.map(fmt);
  // All values equal, or too close to tell apart once formatted: one swatch, one label.
  if (new Set(boundaries).size < boundaries.length) {
    return { kind: 'ranges', items: [{ step: b.steps[0], text: boundaries[0] }] };
  }
  return { kind: 'scale', steps: b.steps, boundaries };
}

/** Smallest cell side; below it the grid overflows its box instead of shrinking. */
export const CELL_MIN = 12;
/** Largest cell side; leftover room stays empty. */
export const CELL_MAX = 48;

export interface HeatmapLayout {
  /** Top-left of the cell grid. */
  plot: { x: number; y: number };
  /** Side of every (square) cell. */
  cell: number;
  /** Grid plus the column-label band. */
  height: number;
  /**
   * Height when only the width limits the cells: the svg's in-flow height, so a parent without a definite height
   * sizes the plot to it (a taller svg than the grid is empty below it).
   */
  naturalHeight: number;
  /** Narrowest plot that fits minimum cells. */
  minWidth: number;
  /** Row-label anchors (text-anchor end, vertically centred). */
  rowLabels: { index: number; x: number; y: number }[];
  /** Column labels kept after thinning (text-anchor middle, baseline `y`). */
  columnLabels: { index: number; x: number; y: number }[];
  /** Cell under a point relative to the svg, or `null` outside the grid. */
  cellAt(x: number, y: number): { row: number; col: number } | null;
}

/**
 * Square cells as large as fit `width` and, when given (> 0), `height`; never under `CELL_MIN` (so a box too small
 * gets a grid that overflows it) nor over `CELL_MAX`. The grid sits at the top-left; leftover room stays empty. Row labels on the left,
 * thinned column labels underneath.
 */
export function computeHeatmapLayout({
  rows,
  columns,
  width,
  height: boxHeight = 0,
}: {
  rows: readonly string[];
  columns: readonly string[];
  width: number;
  height?: number;
}): HeatmapLayout {
  const nRows = Math.max(1, rows.length);
  const nCols = Math.max(1, columns.length);
  const plotX = Math.max(0, ...rows.map(estimateTextWidth)) + LABEL_GAP;
  const avail = Math.max(1, width - plotX);
  // The last column label is centred on its cell; keep its right half inside the svg.
  const lastHalf = columns.length ? estimateTextWidth(columns[columns.length - 1]) / 2 : 0;
  const padRight = Math.max(0, lastHalf - avail / nCols / 2);
  const widthCell = Math.min(CELL_MAX, Math.max(CELL_MIN, (avail - padRight) / nCols));
  const heightCell = boxHeight > 0 ? (boxHeight - X_AXIS_HEIGHT) / nRows : Infinity;
  const cell = Math.max(CELL_MIN, Math.min(widthCell, heightCell));
  const plotY = 0;
  const height = plotY + cell * rows.length + X_AXIS_HEIGHT;
  return {
    plot: { x: plotX, y: plotY },
    cell,
    height,
    naturalHeight: plotY + widthCell * rows.length + X_AXIS_HEIGHT,
    minWidth: Math.ceil(plotX + CELL_MIN * nCols + lastHalf),
    rowLabels: rows.map((_, index) => ({
      index,
      x: plotX - LABEL_GAP,
      y: plotY + (index + 0.5) * cell,
    })),
    columnLabels: thinLabels(columns, cell).map((index) => ({
      index,
      x: plotX + (index + 0.5) * cell,
      y: height - X_LABEL_BASELINE,
    })),
    cellAt(x, y) {
      const col = Math.floor((x - plotX) / cell);
      const row = Math.floor((y - plotY) / cell);
      if (x < plotX || y < plotY || col >= columns.length || row >= rows.length) return null;
      return { row, col };
    },
  };
}
