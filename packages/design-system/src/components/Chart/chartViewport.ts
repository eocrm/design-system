import type { ChartGeometry } from './chartModel';

/**
 * Visible window of the chart's current domain (the `zoomRange` slice, else all categories), as fractions
 * 0..1 with `from < to`. Band edges: 0 is the left edge of the first category's band, 1 the right edge of the
 * last. `null` (where accepted) means everything.
 */
export interface ChartViewport {
  /** Left edge of the window, 0..1 of the domain. */
  from: number;
  /** Right edge of the window, 0..1 of the domain. */
  to: number;
}

/** The window never shrinks below this many categories. */
export const MIN_VIEWPORT_CATEGORIES = 2;
/** Float tolerance for band-edge maths (a window edge that lands on a band edge). */
export const EPS = 1e-9;
const minSpan = (n: number) => Math.min(1, MIN_VIEWPORT_CATEGORIES / n);

/** Keeps `span` and shifts the window into 0..1; null when it covers everything. */
function place(from: number, span: number): ChartViewport | null {
  if (span >= 1 - EPS) return null;
  const f = Math.min(1 - span, Math.max(0, from));
  return { from: f, to: f + span };
}

/** Clamps `v` into 0..1 with a span of at least two categories; null when it covers everything or `n < 2`. */
export function clampViewport(v: ChartViewport, n: number): ChartViewport | null {
  if (n < 2 || !Number.isFinite(v.from) || !Number.isFinite(v.to)) return null;
  const span = v.to - v.from;
  const min = minSpan(n);
  // Too narrow (or inverted): widen around its centre.
  return span < min ? place((v.from + v.to) / 2 - min / 2, min) : place(v.from, span);
}

/** Scales the window by `factor` (< 1 zooms in), keeping the domain point under `anchor` (0..1 of the visible plot) fixed. */
export function zoomViewport(
  v: ChartViewport | null,
  factor: number,
  anchor: number,
  n: number,
): ChartViewport | null {
  if (n < 2) return null;
  const { from, to } = v ?? { from: 0, to: 1 };
  const point = from + anchor * (to - from);
  const span = Math.max(minSpan(n), (to - from) * factor);
  return place(point - anchor * span, span);
}

/** Moves the window by `delta` domain fractions, keeping its span; null stays null. */
export function panViewport(
  v: ChartViewport | null,
  delta: number,
  n: number,
): ChartViewport | null {
  return v && clampViewport({ from: v.from + delta, to: v.to + delta }, n);
}

/** Indices of the categories whose band overlaps the window (`to < from` when there are none). */
export function visibleIndexRange(
  v: ChartViewport | null,
  n: number,
): { from: number; to: number } {
  if (!v || n === 0) return { from: 0, to: n - 1 };
  return {
    from: Math.max(0, Math.floor(v.from * n + EPS)),
    to: Math.min(n - 1, Math.ceil(v.to * n - EPS) - 1),
  };
}

/** Svg x → 0..1 of the domain (band edges), clamped to the plot (so to the visible window); 0 with no categories. */
export function domainFractionAt(layout: ChartGeometry, x: number): number {
  const n = layout.categoryX.length;
  if (n === 0) return 0;
  const { plot } = layout;
  const px = Math.max(plot.x, Math.min(plot.x + plot.width, x));
  return Math.max(
    0,
    Math.min(1, (px - (layout.categoryX[0] - layout.step / 2)) / (n * layout.step)),
  );
}

/** Pans the window minimally so category `index`'s band is inside it; null stays null. */
export function ensureVisible(
  v: ChartViewport | null,
  index: number,
  n: number,
): ChartViewport | null {
  if (!v || n === 0) return v;
  const lo = index / n;
  const hi = (index + 1) / n;
  const delta = lo < v.from ? lo - v.from : hi > v.to ? hi - v.to : 0;
  return delta === 0 ? v : panViewport(v, delta, n);
}
