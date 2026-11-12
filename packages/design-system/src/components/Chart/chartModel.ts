import { scaleLinear } from 'd3-scale';
import { stack, stackOffsetDiverging, stackOffsetNone, type Series } from 'd3-shape';
import { clampViewport, EPS, visibleIndexRange, type ChartViewport } from './chartViewport';

/** Chart form. `area` is always stacked. */
export type ChartType = 'line' | 'bar' | 'stacked-bar' | 'area';

/** Line/area interpolation: `smooth` is a monotone curve, `linear` straight segments. */
export type ChartCurve = 'smooth' | 'linear';

/** Categorical palette slot (`--chart-series-N`), 1–8. */
export type ChartSeriesColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** One plotted series. `values[i]` belongs to `categories[i]`; `null` is a gap. */
export interface ChartSeries {
  /** Stable identity: legend toggles, `hiddenSeries` and `comparisonOf` refer to it. */
  key: string;
  /** Human name shown in the legend, tooltip and data table. */
  label: string;
  /** One value per category; `null` is a gap. */
  values: (number | null)[];
  /**
   * Marks this series as a comparison (e.g. previous period) of another: the `key` of its parent
   * series, or `'total'` for the stacked sum. Supported on `line`, `bar` and `area`.
   */
  comparisonOf?: string;
  /** Palette slot (1–8); overrides the positional colour. Ignored on comparison series, which inherit their parent's. */
  color?: ChartSeriesColor;
}

/**
 * Marker tone.
 * - `'neutral'` — default; a visible dashed line or grey band for events (launch, campaign).
 * - `'subtle'` — a faint band or line for recurring context (weekends, off-hours) that must not compete with data.
 */
export type ChartMarkerTone = 'neutral' | 'subtle';

/**
 * Where a marker's `label` is drawn.
 * - `'beside'` — default; on the plot, just right of the line / inside the band's left edge.
 * - `'top'` — centred above the plot, under the `icon` when there is one.
 */
export type ChartMarkerLabelPlacement = 'beside' | 'top';

interface ChartMarkerBase {
  /** Stable identity (React key). */
  key: string;
  /** Short text drawn on the plot and listed in the tooltip, keyboard announcement and data table. Omit for decorative shading (weekends). */
  label?: string;
  /** Visual weight. Default `'neutral'`. */
  tone?: ChartMarkerTone;
  /** Palette slot (1–8) the line strokes / band tints in, and the label text too, e.g. to match a series. Default: neutral ink. */
  color?: ChartSeriesColor;
  /** Short text or emoji drawn centred above the marker, in the gutter above the plot. Decorative: never read out (`label` carries meaning). */
  icon?: string;
  /** Where `label` is drawn. Default `'beside'`. */
  labelPlacement?: ChartMarkerLabelPlacement;
}

/**
 * A static annotation pinned to categories: a vertical line at one category (`at`) or a shaded band over a
 * category range (`from`…`to`, inclusive). Values are category labels from `categories`.
 */
export type ChartMarker =
  | (ChartMarkerBase & {
      /** Category the vertical line sits on (its centre). */
      at: string;
      from?: never;
      to?: never;
    })
  | (ChartMarkerBase & {
      /** First category of the band (inclusive). */
      from: string;
      /** Last category of the band (inclusive); may equal `from` for one bucket. */
      to: string;
      at?: never;
    });

/**
 * A horizontal line at a constant y value across the full plot width, e.g. a target or a 30-day average.
 * Each line's array index picks its dash pattern, so keep the order stable.
 */
export interface ChartReferenceLine {
  /** Stable identity (React key). Default: the array index. */
  key?: string;
  /** Y value the line sits at; always inside the y domain. A non-finite value is ignored with a dev warning. */
  value: number;
  /** Name shown in the legend, tooltip, keyboard announcement and data table, e.g. "30-day average". */
  label: string;
  /** Palette slot (1–8) the line strokes in. Default: neutral ink. */
  color?: ChartSeriesColor;
  /**
   * `'strong'` draws the line at `--chart-reference-width-strong` so one line stands out, e.g. today's pace over the
   * usual. Default `'default'`.
   */
  emphasis?: 'default' | 'strong';
}

/** Annotation shape: a filled triangle pointing `up` or `down`, or a `dot`. The shape carries the meaning without colour. */
export type ChartAnnotationGlyph = 'up' | 'down' | 'dot';

/** Annotation colour: the semantic status ink (`neutral` is muted ink). */
export type ChartAnnotationTone = 'success' | 'danger' | 'warning' | 'neutral';

/** A small status glyph drawn above (below, for negatives) one category's tallest mark, e.g. "ahead of pace". */
export interface ChartAnnotation {
  /** Stable identity (React key). Default: the array index. */
  key?: string;
  /** Category the glyph sits on; one of `categories`. An unknown category is ignored with a dev warning. */
  at: string;
  /** Shape: `'up'` / `'down'` triangle for a trend, `'dot'` for a plain flag. */
  glyph: ChartAnnotationGlyph;
  /** Colour: `'success'`, `'danger'`, `'warning'`, or `'neutral'` (muted ink). */
  tone: ChartAnnotationTone;
  /** What the glyph means, e.g. "Ahead of usual pace". Listed in the tooltip, keyboard announcement and data table. */
  label: string;
}

/** Internal (not in the public API): an annotation mapped onto a category index. */
export interface ResolvedAnnotation {
  key: string;
  /** Category index. */
  index: number;
  glyph: ChartAnnotationGlyph;
  tone: ChartAnnotationTone;
  label: string;
}

/** Maps annotations onto category indices; ones naming an unknown category are dropped (their `at` reported). */
export function resolveAnnotations(
  annotations: readonly ChartAnnotation[],
  categories: readonly string[],
): { annotations: ResolvedAnnotation[]; dropped: string[] } {
  const resolved: ResolvedAnnotation[] = [];
  const dropped: string[] = [];
  annotations.forEach((a, i) => {
    const index = categories.indexOf(a.at);
    if (index < 0) dropped.push(a.at);
    else
      resolved.push({
        key: a.key ?? String(i),
        index,
        glyph: a.glyph,
        tone: a.tone,
        label: a.label,
      });
  });
  return { annotations: resolved, dropped };
}

/** Labels of the annotations on category `i`, in array order. */
export function annotationLabelsAt(
  annotations: readonly ResolvedAnnotation[],
  i: number,
): string[] {
  return annotations.flatMap((a) => (a.index === i ? [a.label] : []));
}

/** One annotation glyph: `x` its centre, `y` its bottom edge (it spans `y - ANNOTATION_SIZE`..`y`). */
export interface AnnotationGeometry {
  key: string;
  index: number;
  x: number;
  y: number;
  glyph: ChartAnnotationGlyph;
  tone: ChartAnnotationTone;
  /** True when it hangs below a negative mark. */
  below: boolean;
}

/** Where an annotated category's glyphs go: after its value label, centred over (under) it, or over the mark. */
interface AnnotationPlan {
  end: number;
  below: boolean;
  /** Centre x of the mark (the tallest bar of a group) and of its value label. */
  x: number;
  /** The value label's text; '' when there is none. */
  text: string;
  mode: 'beside' | 'stacked' | 'mark';
}

/** Glyph box side in px: the glyph path is drawn at this size, and the layout places it and reserves its room. */
export const ANNOTATION_SIZE = 12;
const ANNOTATION_GAP = 2;

/** Glyph path in an `ANNOTATION_SIZE` box, bottom-centre at the origin. */
export function annotationPath(glyph: ChartAnnotationGlyph): string {
  const [h, lo, hi, r] = [0.5, -0.1, -0.95, 0.35].map((f) => +(f * ANNOTATION_SIZE).toFixed(2));
  if (glyph === 'up') return `M${-h},${lo}L${h},${lo}L0,${hi}Z`;
  if (glyph === 'down') return `M${-h},${hi}L${h},${hi}L0,${lo}Z`;
  return `M${-r},${-h}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
}

/** Geometry of one reference line in svg coordinates. */
export interface ReferenceLineGeometry {
  key: string;
  y: number;
  /** The plot's left edge. */
  x1: number;
  /** The plot's right edge. */
  x2: number;
  /** Dash pattern index (`--chart-reference-dash-N`): the line's array index mod 3. */
  dash: number;
  /** Palette slot 1..8; 0 = neutral ink. */
  slot: number;
  emphasis?: 'strong';
}

/** Dash patterns reference lines cycle through (`--chart-reference-dash-0..2`). */
export const REFERENCE_DASHES = 3;

export interface ResolvedMarker {
  key: string;
  label?: string;
  tone: ChartMarkerTone;
  kind: 'line' | 'band';
  /** Category index range, inclusive; `from === to` for a line. */
  from: number;
  to: number;
  /** Palette slot 1..8; 0 = neutral ink. */
  slot: number;
  icon?: string;
  placement: ChartMarkerLabelPlacement;
}

/** Maps markers onto category indices; markers naming an unknown category are dropped. */
export function resolveMarkers(
  markers: readonly ChartMarker[],
  categories: readonly string[],
): { markers: ResolvedMarker[]; dropped: string[] } {
  const resolved: ResolvedMarker[] = [];
  const dropped: string[] = [];
  for (const m of markers) {
    const range = m.at === undefined ? [m.from, m.to] : [m.at, m.at];
    const [a, b] = range.map((c) => categories.indexOf(c as string));
    if (a < 0 || b < 0) {
      dropped.push(m.key);
      continue;
    }
    resolved.push({
      key: m.key,
      label: m.label || undefined,
      tone: m.tone ?? 'neutral',
      kind: m.at === undefined ? 'band' : 'line',
      from: Math.min(a, b),
      to: Math.max(a, b),
      slot: m.color ?? 0,
      icon: m.icon || undefined,
      placement: m.labelPlacement ?? 'beside',
    });
  }
  return { markers: resolved, dropped };
}

const topLabel = (m: ResolvedMarker) => (m.placement === 'top' ? m.label : undefined);

/** Rows of the gutter above the plot: 2 when a marker stacks an icon over a top label, 1 for an icon or a top label alone. */
export function markerGutterRows(markers: readonly ResolvedMarker[]): 0 | 1 | 2 {
  if (markers.some((m) => m.icon && topLabel(m))) return 2;
  return markers.some((m) => m.icon || topLabel(m)) ? 1 : 0;
}

/** Extra gutter height that keeps icons off the plot top: only when some marker has an icon. */
export const markerGutterGap = (markers: readonly ResolvedMarker[]) =>
  markers.some((m) => m.icon) ? MARKER_ICON_GAP : 0;

/** Labels of the markers covering category `i`, in marker order. */
export function markerLabelsAt(markers: readonly ResolvedMarker[], i: number): string[] {
  return markers.flatMap((m) => (m.label && m.from <= i && i <= m.to ? [m.label] : []));
}

export interface MarkerGeometry {
  key: string;
  kind: 'line' | 'band';
  tone: ChartMarkerTone;
  /** Palette slot 1..8; 0 = neutral ink. */
  slot: number;
  /** Line x, or band left edge. */
  x: number;
  /** Band width; 0 for a line. */
  width: number;
  /** Label to draw, or undefined when absent or it would collide/clip. */
  label?: { text: string; x: number; anchor: 'start' | 'end' };
  /** Icon and/or top label above the plot, centred on `x` (shifted inward at the edges); undefined when absent or it would collide. */
  top?: { x: number; icon?: string; label?: string };
}

/** Marker geometry in svg coordinates. Labels that would overlap an earlier label or leave the plot are dropped. */
export function layoutMarkers(
  markers: readonly ResolvedMarker[],
  layout: Pick<ChartLayout, 'plot' | 'categoryX' | 'step'>,
): MarkerGeometry[] {
  const { plot, categoryX, step } = layout;
  const right = plot.x + plot.width;
  const taken: [number, number][] = [];
  const takenTop: [number, number][] = [];
  const free = (spans: [number, number][], [a0, a1]: [number, number]) =>
    spans.every(([a, b]) => a1 + LABEL_GAP <= a || b + LABEL_GAP <= a0);
  return markers.map((m) => {
    const x = m.kind === 'line' ? categoryX[m.from] : categoryX[m.from] - step / 2;
    const width = m.kind === 'line' ? 0 : (m.to - m.from + 1) * step;
    const g: MarkerGeometry = { key: m.key, kind: m.kind, tone: m.tone, slot: m.slot, x, width };
    const above = topLabel(m);
    // Centre on the visible part of the marker; a marker wholly outside the plot (a viewport scrolled
    // past it) has no top item and no label: never pull it into view.
    const lo = Math.max(x, plot.x);
    const hi = Math.min(x + width, right);
    const shown = m.kind === 'line' ? lo <= hi : hi - lo > EDGE_SLACK;
    if ((m.icon || above) && shown) {
      const half = Math.max(m.icon ? iconWidth(m.icon) : 0, above ? textWidth(above) : 0) / 2;
      const cx = Math.max(plot.x + half, Math.min(right - half, (lo + hi) / 2));
      const span: [number, number] = [cx - half, cx + half];
      if (free(takenTop, span)) {
        takenTop.push(span);
        g.top = { x: cx, ...(m.icon && { icon: m.icon }), ...(above && { label: above }) };
      }
    }
    // A beside label starts at the line / band's left edge, so that edge must be on the plot.
    if (!m.label || above || x < plot.x - EDGE_SLACK || x > right) return g;
    const w = textWidth(m.label);
    // Start just right of the line / inside the band's left edge; flip left of a line near the right edge.
    let anchor: 'start' | 'end' = 'start';
    let lx = x + MARKER_LABEL_INSET;
    if (lx + w > right && m.kind === 'line') {
      anchor = 'end';
      lx = x - MARKER_LABEL_INSET;
    }
    const span: [number, number] = anchor === 'start' ? [lx, lx + w] : [lx - w, lx];
    const fits = span[0] >= plot.x && span[1] <= right;
    if (fits && free(taken, span)) {
      taken.push(span);
      g.label = { text: m.label, x: lx, anchor };
    }
    return g;
  });
}

/** Distinct categorical colours; series past this reuse the palette with a dashed/outlined overflow style. */
export const PALETTE_SIZE = 8;
// ponytail: estimated glyph widths at --font-size-sm (12px) instead of measuring text;
// measure with canvas.measureText if labels clip or overlap in real fonts.
export const LABEL_GAP = 8;
/** Distance of the x-label baseline from the svg bottom edge. */
export const X_LABEL_BASELINE = 4;
/** Radius of the isolated-point dots. */
export const DOT_RADIUS = 3;
/** Radius of the keyboard/hover inspection marker on a line point. */
export const MARKER_RADIUS = 4;
/** Baseline of marker labels below the plot top; also the height of one marker gutter row above the plot. */
export const MARKER_LABEL_BASELINE = 12;
/** Space between a marker icon and the plot top; mirrors `--chart-marker-icon-gap` (`--space-1`), keep in sync. */
export const MARKER_ICON_GAP = 4;
// ponytail: an icon is estimated as one emoji (~1.25em at --chart-marker-icon-size 14px) or
// its 12px text estimate scaled to 14px, whichever is wider; measure if icons overlap in real fonts.
const ICON_MIN_WIDTH = 18;
const iconWidth = (icon: string) => Math.max(ICON_MIN_WIDTH, (textWidth(icon) * 14) / 12);
/** Below this root height the legend collapses to one row with a "+N" counter. */
export const COMPACT_HEIGHT = 120;

const MARK_GAP = 2;
/** Sub-pixel tolerance for float drift at the plot edges. */
const EDGE_SLACK = 0.5;
const MARKER_LABEL_INSET = 4;
const BAR_RADIUS = 4;
const BAND_RATIO = 0.65;
export const PAD_TOP = 8;
/** Value-label line height; the scale reserves it (plus `VALUE_LABEL_GAP`) beyond the tallest / lowest bar. */
const VALUE_LABEL_HEIGHT = 14;
const VALUE_LABEL_GAP = 2;
export const PAD_RIGHT = 8;
export const X_AXIS_HEIGHT = 20;
export const Y_TICK_SPACING = 40;
const LEGEND_ITEM_EXTRA = 28; // swatch + gaps around one legend item
const LEGEND_MORE_WIDTH = 4 * 7; // "+NN"

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

/**
 * Palette slot per series: explicit colours first (may be shared), then unset ones fill the free slots in
 * order; once none are free they wrap positionally and are flagged `overflow`.
 */
export function assignSlots(
  colors: readonly (ChartSeriesColor | undefined)[],
): { slot: number; overflow: boolean }[] {
  const claimed = new Set(colors.filter((c) => c !== undefined));
  const free = Array.from({ length: PALETTE_SIZE }, (_, i) => i + 1).filter(
    (s) => !claimed.has(s as ChartSeriesColor),
  );
  return colors.map((c, i) => {
    if (c !== undefined) return { slot: c, overflow: false };
    const slot = free.shift();
    return slot === undefined
      ? { slot: (i % PALETTE_SIZE) + 1, overflow: true }
      : { slot, overflow: false };
  });
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
  const slots = assignSlots(primaries.map((p) => p.color));
  primaries.forEach((p, i) => {
    const { slot, overflow } = slots[i];
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
  return { series, dropped, overflowCount: slots.filter((x) => x.overflow).length };
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

/** Estimated pixel width of `text` at the chart's 12px font, by glyph class (digits 7, `%` 11, capitals / m / w 9, W / M and wide Cyrillic capitals 12, CJK 12...). */
export function estimateTextWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (ch === '%') w += 11;
    else if (/[\d.,\s\u2212+-]/.test(ch)) w += 7;
    else if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch))
      w += 12;
    // W and M render ~11–12px at 12px; at 9 a "Wed" / "Mon" heatmap row label clipped at the edge (DS-41).
    else if (/[WMМШЩЖЮФЫ]/u.test(ch)) w += 12;
    else if (/[\p{Lu}mw]/u.test(ch)) w += 9;
    else if (/\p{L}/u.test(ch)) w += 7;
    else w += 9;
  }
  return w;
}
const textWidth = estimateTextWidth;

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

/**
 * Viewport x labels: categories whose centre is on the plot, thinned on absolute indices (every k-th, k from the
 * widest label of all categories) so labels don't hop between neighbours while the window pans.
 */
function windowLabels(
  categories: readonly string[],
  categoryX: readonly number[],
  plot: Rect,
  step: number,
): number[] {
  const onPlot = categories.flatMap((_, i) =>
    categoryX[i] >= plot.x - EDGE_SLACK && categoryX[i] <= plot.x + plot.width + EDGE_SLACK
      ? [i]
      : [],
  );
  if (onPlot.length === 0) return [];
  const every = Math.max(1, Math.ceil((Math.max(...categories.map(textWidth)) + LABEL_GAP) / step));
  const kept = onPlot.filter((i) => i % every === 0);
  return kept.length > 0 ? kept : [onPlot[0]];
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

/** A bar value label: `y` is the text baseline; `x` its centre. */
export interface ValueLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'above' | 'below';
}

export interface LayoutInput {
  type: ChartType;
  categories: readonly string[];
  /** Visible series only, in `resolveSeries` order. */
  series: readonly ResolvedSeries[];
  width: number;
  height: number;
  formatValue: (n: number) => string;
  /** Line/area interpolation; default `'smooth'`. */
  curve?: ChartCurve;
  /** Label each bar (`bar`) or stack total (`stacked-bar`) with its value; ignored on line/area. */
  valueLabels?: boolean;
  /** Pixels reserved above the plot for marker icons / top labels; default 0. */
  topGutter?: number;
  /**
   * Render window (fractions of the categories, band edges); `null` = all. x positions shift and stretch so the
   * window fills the plot (marks outside it are the renderer's to clip), the y domain and the x labels come from
   * the visible categories only. Clamped with `clampViewport`.
   */
  viewport?: ChartViewport | null;
  /** Horizontal reference lines; finite values join the y domain (also under a viewport), the rest are dropped. */
  referenceLines?: readonly ChartReferenceLine[];
  /** Resolved annotations; the scale reserves glyph room above (below, for negatives) the annotated in-view marks. */
  annotations?: readonly ResolvedAnnotation[];
  /** `line` only: `false` fits the y domain to the data instead of anchoring it at 0. Default `true`. */
  includeZero?: boolean;
  /** Whole-number y ticks only (counts): a domain narrower than a tick step of 1 is widened to whole numbers. Default `false`. */
  integerValues?: boolean;
  /** Fixed left gutter (plot.x) in px, replacing the measured tick-label width, so stacked plots share an x axis. */
  gutterLeft?: number;
  /** `false` draws no x labels and reserves no x-axis height below the plot. Default `true`. */
  xLabels?: boolean;
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
  /** Bar value labels; empty unless requested on a bar type. A label wider than its bar is omitted. */
  valueLabels: ValueLabel[];
  /** Reference lines with a finite value, in input order. */
  referenceLines: ReferenceLineGeometry[];
  /** Annotation glyphs on in-view, non-null categories, in input order. */
  annotations: AnnotationGeometry[];
  /** The y value at an svg y (inverse of the y scale). */
  valueAt: (svgY: number) => number;
}

/** The x geometry interaction needs: plot rect, category centres and band step. */
export type ChartGeometry = Pick<ChartLayout, 'plot' | 'categoryX' | 'step'>;

type StackRow = Record<string, number>;

const isolated = (values: readonly (number | null)[], i: number) =>
  values[i] !== null && (values[i - 1] ?? null) === null && (values[i + 1] ?? null) === null;

export function computeLayout(input: LayoutInput): ChartLayout {
  const { type, categories, series, width, height, formatValue } = input;
  const n = categories.length;
  const vp = input.viewport ? clampViewport(input.viewport, n) : null;
  // Categories in view, by band; only their values set the y domain.
  const shown = visibleIndexRange(vp, n);
  const inView = (i: number) => i >= shown.from && i <= shown.to;
  /** Domain width the plot shows: 1 = all categories. */
  const span = vp ? vp.to - vp.from : 1;
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

  // A cut baseline is only honest on a line: bars and stacked area always start at 0.
  const fitData = input.includeZero === false && type === 'line';
  let min = fitData ? Infinity : 0;
  let max = fitData ? -Infinity : 0;
  const take = (v: number | null) => {
    if (v === null || Number.isNaN(v)) return;
    if (v < min) min = v;
    if (v > max) max = v;
  };
  const takeShown = (values: readonly (number | null)[]) =>
    values.forEach((v, i) => inView(i) && take(v));
  if (layers)
    for (const layer of layers)
      layer.forEach(([y0, y1], i) => {
        if (!inView(i)) return;
        take(y0);
        take(y1);
      });
  else for (const p of primaries) takeShown(p.values);
  for (const c of comparisons) takeShown(c.values);
  const references = (input.referenceLines ?? []).flatMap((r, i) =>
    Number.isFinite(r.value) ? [{ r, i }] : [],
  );
  for (const { r } of references) take(r.value);

  const linear = input.curve === 'linear';
  const samples = Math.max(
    2,
    Math.min(MAX_SAMPLES, Math.ceil(width / Math.max(1, n * span) / SAMPLE_PX)),
  );
  const smoothed = new Map(
    (type === 'line' ? series : stacked ? comparisons : []).map((x) => [
      x.key,
      smoothLine(x.values, samples, linear),
    ]),
  );
  const areaStack =
    type === 'area'
      ? smoothStack(
          primaries.map((p) => p.values.map((v) => v ?? 0)),
          samples,
          linear,
        )
      : null;
  // Each layer stays within its own values, but layers trading places can lift the stacked top past
  // the largest real total: keep that inside the plot.
  for (const layer of areaStack ?? [])
    layer.forEach((seg, i) => inView(i) && inView(i + 1) && seg.forEach(take));
  if (min === Infinity) min = max = 0; // fitData, no values at all
  if (min === max) max = min + 1;

  const plotTop = PAD_TOP + (input.topGutter ?? 0);
  const showXLabels = input.xLabels !== false;
  const plotBottom = Math.max(plotTop + 1, height - (showXLabels ? X_AXIS_HEIGHT : 0));
  const tickCount = Math.max(2, Math.floor((plotBottom - plotTop) / Y_TICK_SPACING));
  const labelled = !!input.valueLabels && (type === 'bar' || type === 'stacked-bar');
  const room = labelled ? VALUE_LABEL_HEIGHT + VALUE_LABEL_GAP : 0;
  const posTotal = layers && categories.map((_, i) => Math.max(0, ...layers.map((l) => l[i][1])));
  const negTotal = layers && categories.map((_, i) => Math.min(0, ...layers.map((l) => l[i][0])));
  // The y scale's domain and ticks don't depend on its range: fix them first, so the plot (and the bar slots the
  // annotation placement needs) is known before the range reserves room.
  const y = scaleLinear().domain([min, max]).nice(tickCount);
  let tickValues = y.ticks(tickCount);
  if (input.integerValues && tickValues.length >= 2 && tickValues[1] - tickValues[0] < 1) {
    // Sub-1 steps: snap the domain to whole numbers and tick every one (the span is under a tick count wide).
    const lo = Math.floor(min);
    const hi = Math.max(Math.ceil(max), lo + 1);
    y.domain([lo, hi]);
    tickValues = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  const tickLabels = tickValues.map(formatValue);
  const left = input.gutterLeft ?? Math.max(0, ...tickLabels.map(textWidth)) + LABEL_GAP;
  const plot: Rect = {
    x: left,
    y: plotTop,
    width: Math.max(1, width - left - PAD_RIGHT),
    height: plotBottom - plotTop,
  };
  const step = plot.width / Math.max(1, n * span);
  const bandWidth = step * BAND_RATIO;
  const shift = (vp?.from ?? 0) * n * step;
  const categoryX = categories.map((_, i) => plot.x + step * (i + 0.5) - shift);
  const groups = series.length;
  // Shrink the gap with the slot so a group never spills into its neighbours.
  const gap = Math.min(MARK_GAP, bandWidth / (2 * groups));
  const barWidth = (bandWidth - gap * (groups - 1)) / groups;

  // Annotations: per in-view, non-null annotated category, the mark it sits on and where.
  const annotated = (input.annotations ?? []).filter((a) => inView(a.index));
  const count = new Map<number, number>();
  for (const a of annotated) count.set(a.index, (count.get(a.index) ?? 0) + 1);
  const plans = new Map<number, AnnotationPlan>();
  for (const i of count.keys()) {
    const vals = (layers ? primaries : series).flatMap((x) =>
      x.values[i] === null ? [] : [x.values[i]!],
    );
    if (vals.length === 0) continue;
    let end: number;
    let below: boolean;
    let x = categoryX[i];
    // Right edge of the mark's slot: half the gap to the next bar, or to the next category.
    let limit = categoryX[i] + step / 2;
    let label: number | null = null;
    if (layers) {
      // The side follows the net total, as the stack's value label does.
      const total = vals.reduce((a, b) => a + b, 0);
      below = total < 0;
      end = below ? negTotal![i] : posTotal![i];
      if (labelled) label = total;
    } else {
      const hi = Math.max(...vals);
      const lo = Math.min(...vals);
      below = lo < 0 && hi <= 0;
      end = below ? lo : hi;
      if (type === 'bar') {
        const j = series.findIndex((x) => x.values[i] === end);
        x = categoryX[i] - bandWidth / 2 + j * (barWidth + gap) + barWidth / 2;
        if (j < groups - 1) limit = x + barWidth / 2 + gap / 2;
        if (labelled) label = end;
      }
    }
    const text = label === null ? '' : formatValue(label);
    const avail = type === 'bar' ? barWidth : bandWidth;
    const k = count.get(i)!;
    let mode: AnnotationPlan['mode'] = 'mark';
    if (text && textWidth(text) <= avail) {
      const right = x + textWidth(text) / 2 + k * (ANNOTATION_SIZE + ANNOTATION_GAP);
      mode = right <= Math.min(limit, plot.x + plot.width) ? 'beside' : 'stacked';
    }
    plans.set(i, { end, below, x, text, mode });
  }
  // Line points carry a dot / inspection marker: clear it too.
  const pointLift = type === 'line' || type === 'area' ? MARKER_RADIUS : 0;
  const glyphRoom = ANNOTATION_SIZE + ANNOTATION_GAP + pointLift;
  const roomFor = (below: boolean) =>
    Math.max(
      0,
      ...[...plans.values()].map((pl) =>
        pl.below !== below ? 0 : pl.mode === 'stacked' ? room + glyphRoom : glyphRoom,
      ),
    );
  y.range([
    plotBottom - Math.max(min < 0 ? room : 0, roomFor(true)),
    plotTop + Math.max(room, roomFor(false)),
  ]);
  const zeroY = y(0);

  const yTicks = tickValues.map((value, i) => ({ value, y: y(value), label: tickLabels[i] }));
  // Clamp end labels inside the svg, then drop any label the clamping made collide.
  const boxes = (
    vp ? windowLabels(categories, categoryX, plot, step) : thinLabels(categories, step)
  ).map((index) => {
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

  const linePath = (key: string) =>
    sampledRuns(smoothed.get(key) ?? [], categoryX, step, y)
      .map((run) => `M${run.join('L')}`)
      .join('');
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
      line: linePath(x.key),
      points,
      dots: dotsOf(x.values, points),
    };
  };

  const marks: SeriesMarks[] = [];
  const valueLabels: ValueLabel[] = [];
  const addLabel = (x: number, end: number, value: number, avail: number) => {
    const text = formatValue(value);
    if (textWidth(text) > avail) return;
    const above = value >= 0;
    valueLabels.push({
      x,
      y: above ? end - VALUE_LABEL_GAP : end + VALUE_LABEL_GAP + VALUE_LABEL_HEIGHT,
      text,
      anchor: above ? 'above' : 'below',
    });
  };

  if (type === 'line') {
    for (const x of series) marks.push(lineMarks(x));
  } else if (type === 'bar') {
    series.forEach((x, j) => {
      const bars = x.values.map((v, i) => {
        if (v === null) return null;
        const bx = categoryX[i] - bandWidth / 2 + j * (barWidth + gap);
        // A zero gets no bar but still its label, at the zero line.
        if (labelled) addLabel(bx + barWidth / 2, y(v), v, barWidth);
        if (v === 0) return null;
        const top = Math.min(y(v), zeroY);
        const h = Math.max(1, Math.abs(zeroY - y(v)));
        return barPath({ x: bx, y: top, width: barWidth, height: h }, v > 0 ? 'top' : 'bottom');
      });
      marks.push({ ...base(x), kind: 'bars', bars, points: pointsOf(x.values), dots: [] });
    });
  } else if (layers) {
    const pos = posTotal!;
    const neg = negTotal!;
    primaries.forEach((x, j) => {
      const layer = layers[j];
      const points = x.values.map((v, i) =>
        v === null
          ? null
          : { x: categoryX[i], y: y(type === 'area' || v >= 0 ? layer[i][1] : layer[i][0]) },
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
            v > 0 && y1 === pos[i] ? 'top' : v < 0 && y0 === neg[i] ? 'bottom' : null;
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
        // Mask segments touching this series' gaps; the bottom edge is the layer below's top.
        const mask = (segs: number[][]) =>
          segs.map((seg, i) => (x.values[i] === null || x.values[i + 1] === null ? null : seg));
        const flat = (segs: number[][]) => segs.map((seg) => seg.map(() => 0));
        const tops = sampledRuns(mask(areaStack![j]), categoryX, step, y);
        const bottoms = sampledRuns(
          mask(j === 0 ? flat(areaStack![j]) : areaStack![j - 1]),
          categoryX,
          step,
          y,
        );
        const topLine = tops.map((run) => `M${run.join('L')}`).join('');
        const areaPath = tops
          .map((run, r) => `M${run.join('L')}L${[...bottoms[r]].reverse().join('L')}Z`)
          .join('');
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
    if (labelled)
      categories.forEach((_, i) => {
        const vals = primaries.map((p) => p.values[i]).filter((v) => v !== null) as number[];
        const total = vals.reduce((a, b) => a + b, 0);
        if (vals.length === 0) return;
        addLabel(categoryX[i], y(total >= 0 ? pos[i] : neg[i]), total, bandWidth);
      });
  }

  const STEP = ANNOTATION_SIZE + ANNOTATION_GAP;
  const placed = new Map<number, number>();
  const annotations: AnnotationGeometry[] = annotated.flatMap((a) => {
    const pl = plans.get(a.index);
    if (!pl) return [];
    const k = placed.get(a.index) ?? 0;
    placed.set(a.index, k + 1);
    const { end, below, mode } = pl;
    const g = { key: a.key, index: a.index, glyph: a.glyph, tone: a.tone, below };
    // The value label's baseline, as `addLabel` sets it.
    const baseline = below
      ? y(end) + VALUE_LABEL_GAP + VALUE_LABEL_HEIGHT
      : y(end) - VALUE_LABEL_GAP;
    // After the value label, on its baseline.
    if (mode === 'beside') {
      const x0 = pl.x + textWidth(pl.text) / 2 + ANNOTATION_GAP + ANNOTATION_SIZE / 2;
      return [{ ...g, x: x0 + k * STEP, y: baseline }];
    }
    // Otherwise centred over (under) the label or the mark, a group side by side, the group kept inside the plot.
    const n = count.get(a.index)!;
    const half = (n * STEP - ANNOTATION_GAP) / 2;
    const centre = Math.min(Math.max(pl.x, plot.x + half), plot.x + plot.width - half);
    const x = centre + (k - (n - 1) / 2) * STEP;
    if (mode === 'stacked') {
      return [
        {
          ...g,
          x,
          y: below
            ? baseline + ANNOTATION_GAP + ANNOTATION_SIZE
            : baseline - VALUE_LABEL_HEIGHT - ANNOTATION_GAP,
        },
      ];
    }
    const lift = ANNOTATION_GAP + pointLift;
    return [{ ...g, x, y: below ? y(end) + lift + ANNOTATION_SIZE : y(end) - lift }];
  });

  return {
    plot,
    yTicks,
    xLabels: showXLabels ? xLabels.map(({ index, x, label }) => ({ index, x, label })) : [],
    categoryX,
    step,
    bandWidth,
    marks,
    valueLabels,
    referenceLines: references.map(({ r, i }) => ({
      key: r.key ?? String(i),
      y: y(r.value),
      x1: plot.x,
      x2: plot.x + plot.width,
      dash: i % REFERENCE_DASHES,
      slot: r.color ?? 0,
      emphasis: r.emphasis === 'strong' ? 'strong' : undefined,
    })),
    annotations,
    valueAt: (py) => y.invert(Math.max(plot.y, Math.min(plot.y + plot.height, py))),
  };
}

/** Pixels per straight sub-segment of a smoothed curve. */
const SAMPLE_PX = 4;
const MAX_SAMPLES = 32;
const hermite = (y0: number, y1: number, m0: number, m1: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1
  );
};

/**
 * Monotone cubic through `v`: `result[i][s]` is the value at sample s (0..samples) of the segment
 * between points i and i+1. Passes through every point and never leaves the range of its two ends: no
 * dip before a climb, no bump after it, no negative counts, no inverted stack layers.
 */
function smoothRun(v: readonly number[], samples: number, linear = false): number[][] {
  const n = v.length;
  if (linear)
    return Array.from({ length: Math.max(0, n - 1) }, (_, i) =>
      Array.from({ length: samples + 1 }, (_, s) => v[i] + ((v[i + 1] - v[i]) * s) / samples),
    );
  const m = v.map((x, i) => {
    // Two points: full slope at both ends, so the segment is straight rather than an S.
    if (n === 2) return v[1] - v[0];
    // Run ends: half their one real slope, so a climb from the edge starts nearly straight.
    if (i === 0) return (v[1] - x) / 2;
    if (i === n - 1) return (x - v[i - 1]) / 2;
    const d0 = x - v[i - 1];
    const d1 = v[i + 1] - x;
    // Peaks, troughs and flat runs ease in flat.
    if (d0 * d1 <= 0) return 0;
    // Catmull-Rom, capped at 3x the gentler neighbouring slope (Fritsch-Carlson).
    const cap = 3 * Math.min(Math.abs(d0), Math.abs(d1));
    return Math.sign(d0) * Math.min(cap, Math.abs(d0 + d1) / 2);
  });
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => {
    const lo = Math.min(v[i], v[i + 1]);
    const hi = Math.max(v[i], v[i + 1]);
    // The cap leaves a sliver of overshoot possible next to a run end; clamp it away.
    return Array.from({ length: samples + 1 }, (_, s) =>
      Math.min(hi, Math.max(lo, hermite(v[i], v[i + 1], m[i], m[i + 1], s / samples))),
    );
  });
}

/** Smoothed segments of a series with gaps: each defined run is its own curve; `null` where a segment touches a gap. */
function smoothLine(
  values: readonly (number | null)[],
  samples: number,
  linear = false,
): (number[] | null)[] {
  const segs: (number[] | null)[] = Array.from(
    { length: Math.max(0, values.length - 1) },
    () => null,
  );
  for (let a = 0; a < values.length; a++) {
    if (values[a] === null) continue;
    let b = a;
    while (b + 1 < values.length && values[b + 1] !== null) b++;
    smoothRun(values.slice(a, b + 1) as number[], samples, linear).forEach(
      (seg, i) => (segs[a + i] = seg),
    );
    a = b;
  }
  return segs;
}

/**
 * Cumulative tops of smoothed stacked layers: `result[k][i][s]` is the top of layer k at sample s of the
 * segment between categories i and i+1. Each series' own values are smoothed (the same curve as lines,
 * which never crosses 0 between same-signed values) and the curves are stacked. So a steady layer stays
 * steady whatever its neighbours do, a series that is 0 has no thickness, and with non-negative data no
 * layer turns inside out or crosses its neighbour.
 */
export function smoothStack(
  layers: readonly (readonly number[])[],
  samples: number,
  linear = false,
): number[][][] {
  let below: number[][] | null = null;
  return layers.map((v) => {
    const tops = smoothRun(v, samples, linear).map((seg, i) =>
      seg.map((h, s) => (below?.[i][s] ?? 0) + h),
    );
    below = tops;
    return tops;
  });
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Point lists of each drawable run in `segs` (svg coordinates). */
function sampledRuns(
  segs: readonly (readonly number[] | null)[],
  categoryX: readonly number[],
  step: number,
  y: (v: number) => number,
): string[][] {
  const runs: string[][] = [];
  let run: string[] | null = null;
  segs.forEach((seg, i) => {
    if (!seg) {
      run = null;
      return;
    }
    if (!run) runs.push((run = []));
    const samples = seg.length - 1;
    for (let s = run.length === 0 ? 0 : 1; s <= samples; s++)
      run.push(`${r2(categoryX[i] + (step * s) / samples)},${r2(y(seg[s]))}`);
  });
  return runs;
}

/**
 * Category index under svg x coordinate `x`, clamped to the categories visible in the plot (0 when there are none):
 * the axis gutter and right padding map to the window's edge categories, never off-screen ones. Viewport-aware.
 */
export function categoryIndexAt(layout: ChartGeometry, x: number): number {
  const n = layout.categoryX.length;
  if (n === 0) return 0;
  const { plot, step } = layout;
  const at = (px: number) => (px - (layout.categoryX[0] - step / 2)) / step;
  // Band edges: the right edge belongs to the band left of it. EPS as in `visibleIndexRange`, so a window edge on a
  // band edge never picks the off-screen neighbour through float error.
  const lo = Math.max(0, Math.floor(at(plot.x) + EPS));
  const hi = Math.min(n - 1, Math.ceil(at(plot.x + plot.width) - EPS) - 1);
  return Math.max(lo, Math.min(hi, Math.floor(at(x))));
}
