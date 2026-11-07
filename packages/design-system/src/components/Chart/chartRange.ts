import type { ChartMarker, ChartSeries } from './chartModel';

/** An inclusive category range, named by category labels (order-insensitive). */
export interface ChartRange {
  /** First category of the range. */
  from: string;
  /** Last category of the range. */
  to: string;
}

/** Maps a range onto category indices (first match per label, ordered). `null` when absent or naming an unknown category. */
export function resolveRange(
  range: ChartRange | null | undefined,
  categories: readonly string[],
): { from: number; to: number } | null {
  if (!range) return null;
  const a = categories.indexOf(range.from);
  const b = categories.indexOf(range.to);
  if (a < 0 || b < 0) return null;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

/** Builds an ordered range from two category indices. */
export function rangeFromIndices(a: number, b: number, categories: readonly string[]): ChartRange {
  return { from: categories[Math.min(a, b)], to: categories[Math.max(a, b)] };
}

/**
 * Restricts categories, series and markers to the inclusive index window `zoom`.
 * Markers fully outside are dropped, spanning markers are clipped to the window, and markers naming an
 * unknown category pass through unchanged. `originalIndex` maps a sliced index back to the full data.
 */
export function sliceForZoom(
  categories: readonly string[],
  series: readonly ChartSeries[],
  markers: readonly ChartMarker[],
  zoom: { from: number; to: number },
): {
  categories: string[];
  series: ChartSeries[];
  markers: ChartMarker[];
  originalIndex: (i: number) => number;
} {
  const { from, to } = zoom;
  const kept: ChartMarker[] = [];
  for (const m of markers) {
    const a = categories.indexOf(m.at ?? m.from);
    const b = categories.indexOf(m.at ?? m.to);
    if (a < 0 || b < 0) {
      kept.push(m);
      continue;
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi < from || lo > to) continue;
    if (m.at === undefined) {
      kept.push({ ...m, from: categories[Math.max(lo, from)], to: categories[Math.min(hi, to)] });
    } else {
      kept.push(m);
    }
  }
  return {
    categories: categories.slice(from, to + 1),
    series: series.map((s) => ({ ...s, values: s.values.slice(from, to + 1) })),
    markers: kept,
    originalIndex: (i) => from + i,
  };
}
