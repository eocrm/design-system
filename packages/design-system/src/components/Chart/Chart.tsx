import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import { useControllableState } from '../_internal/useControllableState';
import { mergeRefs } from '../_internal/refs';
import { useSize } from '../_internal/useSize';
import { ChartLegend } from './ChartLegend';
import { ChartTable } from './ChartTable';
import { ChartTooltip } from './ChartTooltip';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { sliceForZoom, type ChartRange } from './chartRange';
import {
  computeLayout,
  markerPath,
  markerShape,
  COMPACT_HEIGHT,
  isEmpty,
  layoutMarkers,
  markerGutterRows,
  markerLabelsAt,
  annotationLabelsAt,
  resolveAnnotations,
  resolveMarkers,
  REFERENCE_DASHES,
  PAD_TOP,
  MARKER_LABEL_BASELINE,
  markerGutterGap,
  MARKER_RADIUS,
  LABEL_GAP,
  PALETTE_SIZE,
  X_LABEL_BASELINE,
  resolveSeries,
  visibleSeries,
  type ChartAnnotation,
  type ChartCurve,
  type ChartMarker,
  type ChartReferenceLine,
  type ChartSeries,
  type ChartType,
  type ResolvedSeries,
  type SeriesMarks,
} from './chartModel';
import type { ChartViewport } from './chartViewport';
import { useChartDomain } from './useChartDomain';
import { useChartInteraction } from './useChartInteraction';
import { useChartSync } from '../ChartSync/chartSyncStore';
import { categoryPoint, matchCategory } from '../ChartSync/chartSyncMatch';
import {
  renderAnnotations,
  renderReferenceLines,
  renderSeriesMarks,
  seriesStyle,
} from './chartMarks';
import styles from './Chart.module.scss';

export type {
  ChartAnnotation,
  ChartAnnotationGlyph,
  ChartAnnotationTone,
  ChartCurve,
  ChartMarker,
  ChartMarkerLabelPlacement,
  ChartMarkerTone,
  ChartReferenceLine,
  ChartSeries,
  ChartSeriesColor,
  ChartType,
} from './chartModel';
export type { ChartRange } from './chartRange';

/** What a plain click or tap does on a selectable `Chart`: `'drag'` (default) or `'tap'` (selects one category). */
export type ChartSelectOn = 'drag' | 'tap';
export type { ChartViewport } from './chartViewport';

/** What `onPlotDoubleClick` reports about the double-clicked (double-tapped, or Enter-activated) plot point. */
export interface ChartPlotPointerEvent {
  /** Nearest category, as an index into the `categories` prop (the original index while zoomed). */
  index: number;
  /** Continuous 0..1 position across the current domain (band edges), the same coordinates as `viewport`. */
  fraction: number;
  /** The y value at the pointer, from the y scale; `null` from the keyboard. */
  value: number | null;
  /** Viewport x of the pointer (keyboard: the inspected category's x). */
  clientX: number;
  /** Viewport y of the pointer (keyboard: the plot's vertical middle). */
  clientY: number;
  /** What fired it: a mouse `dblclick`, a touch double-tap, or Enter on the inspected category. */
  source: 'mouse' | 'touch' | 'keyboard';
}

export interface ChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * Chart form. Required.
   * - `'line'` — one line per series (smoothed unless `curve="linear"`); trends over time. Comparison series dashed.
   * - `'bar'` — grouped bars per category; compare a few series per bucket. Comparison bars outlined + light fill.
   * - `'stacked-bar'` — bars stacked per category; parts of a total. Comparison only as `comparisonOf: 'total'` (dashed total line).
   * - `'area'` — stacked areas (smoothed unless `curve="linear"`); parts of a total over time. Same comparison rule as `stacked-bar`.
   */
  type: ChartType;
  /** Accessible name of the figure and caption of its data table, e.g. "Deals won per week". Required. */
  label: string;
  /** X-axis buckets, already formatted by the app ("12 Jan", "W3", "Mar"). `series[].values[i]` belongs to `categories[i]`. */
  categories: string[];
  /**
   * Series to plot, in a stable order. Colour: `color` pins a palette slot (1–8); series without it fill the
   * remaining free slots in order, so keep the order fixed when filtering or pin `color`. Comparison series inherit their parent's colour. At most 8 primary series — fold the rest into an "Other" series in the app
   * (series 9+ still render, dashed/outlined, with a dev warning). `values` shorter than `categories` are padded
   * with gaps; `null` is a gap (lines break, bars are absent). `comparisonOf` marks a de-emphasised comparison
   * (e.g. previous period): a series key (line / bar) or `'total'` (stacked-bar / area).
   */
  series: ChartSeries[];
  /** Formats a number for axis ticks, tooltip and data table (the app owns i18n and currency). Required. */
  formatValue: (n: number) => string;
  /** Line/area interpolation. `'smooth'` (default) is a monotone curve; `'linear'` draws straight segments between points. */
  curve?: ChartCurve;
  /** EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /** Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored. If it would hide every primary series, it is ignored for primaries (the last primary can't be hidden). */
  hiddenSeries?: string[];
  /** Called with the next hidden keys when the user toggles a legend item. */
  onHiddenSeriesChange?: (keys: string[]) => void;
  /**
   * Static annotations pinned to `categories`: `{ key, label?, at }` draws a vertical line at one category,
   * `{ key, label?, from, to }` shades a category range (inclusive), e.g. a campaign or weekends. `tone`:
   * `'neutral'` for events (the tone default) or `'subtle'` for recurring context. `color` (palette slot 1–8) strokes /
   * tints the marker, e.g. to match a series. `icon` (short text or emoji, decorative) is drawn centred above the plot;
   * `labelPlacement: 'top'` moves the label there too, under the icon (default `'beside'`, on the plot). Labelled
   * markers are also listed in the tooltip, the keyboard announcement and the data table; unlabelled ones are
   * decorative. A marker naming an unknown category is ignored with a dev warning.
   */
  markers?: ChartMarker[];
  /**
   * Horizontal lines at constant values, e.g. `[{ value: 35, label: '30-day average' }]`: drawn across the full plot
   * width, over bars and area fills and under line strokes, always inside the y domain (also when zoomed). Neutral ink unless `color`
   * (palette slot 1–8) is set; each line's array index picks its dash pattern (cycling after three), so keep the
   * order stable. Each gets a static legend entry, a muted "label: value" row (via `formatValue`) in the tooltip and
   * the keyboard announcement, and a row in the data table's footer. A non-finite `value` is ignored with a dev warning.
   */
  referenceLines?: ChartReferenceLine[];
  /**
   * Status glyphs on categories, e.g. `[{ at: 'Sun', glyph: 'up', tone: 'success', label: 'Ahead of usual pace' }]`:
   * a small triangle (`'up'` / `'down'`) or `'dot'` in the tone's status ink, drawn just after the value label (with
   * `valueLabels`; centred over it when that would cross into the next bar) or above the category's tallest visible mark (below a negative one); the y scale reserves room for
   * it. Several on one category sit side by side in array order. Decorative (`aria-hidden`): `label` is listed in the
   * tooltip, the keyboard announcement and the data table's notes column. Every chart type. An unknown `at` is ignored
   * with a dev warning.
   */
  annotations?: ChartAnnotation[];
  /**
   * Short note under the plot, e.g. "3 deals in other currencies not included" or why a comparison was omitted.
   * Takes its own row (wraps, never truncates) and the plot fills the rest; also describes the plot for
   * screen readers. Shown in the empty state too, where it often explains the emptiness.
   */
  footnote?: ReactNode;
  /**
   * Extra plain-text lines for a category, e.g. `['235 kcal', '5 times']`. `categoryIndex` indexes `categories`.
   * Shown as muted rows under the series in the tooltip, appended to the keyboard announcement and listed in a
   * "Details" column of the data table (joined with "; "). Strings only; return `[]` for none.
   */
  details?: (categoryIndex: number) => string[];
  /**
   * Print each value on its bar (`bar`, comparisons included) or the stack total above each `stacked-bar`, using
   * `formatValue`. Decorative (`aria-hidden`); the data table and tooltip carry the same values. A label wider than its
   * bar is omitted rather than truncated. Ignored on `line` and `area`. Default `false`.
   */
  valueLabels?: boolean;
  /**
   * `line` only: `false` fits the y axis to the data instead of starting at 0. Bars and stacked area always start at
   * 0 (ignored there), because a cut baseline misstates size. Default `true`.
   */
  includeZero?: boolean;
  /**
   * Whole-number y ticks only, for counts: a small range shows `0, 1, 2` instead of `0, 0.5, 1`. Larger ranges keep
   * their normal ticks. Default `false`.
   */
  integerValues?: boolean;
  /**
   * Controlled selected category range (`null` = none). Passing this, `defaultSelectedRange` or
   * `onSelectedRangeChange` turns selection on (`line`, `area`, `bar`, `stacked-bar`): mouse press + drag
   * past 8px or a touch long-press (300ms) + slide selects, a click or tap outside the band clears,
   * Shift+←/→ extends from the inspected category and Escape clears. A range naming an unknown category
   * is ignored with a dev warning.
   */
  selectedRange?: ChartRange | null;
  /** Initial selection when uncontrolled. Default `null`. Also turns selection on. */
  defaultSelectedRange?: ChartRange | null;
  /** Called with the next selection (or `null` when cleared) on every user change. Also turns selection on. */
  onSelectedRangeChange?: (range: ChartRange | null) => void;
  /**
   * What a plain click or tap does while selection is on (ignored otherwise). `'drag'` (default): inspects, and
   * outside the band clears. `'tap'`: selects that one category; tapping the already-selected single category
   * clears it, tapping another replaces the range. Drag and long-press still select a range. Space toggles the
   * inspected category in both modes.
   */
  selectOn?: ChartSelectOn;
  /**
   * Controlled zoomed category range (`null` = all categories). While zoomed, categories, series, markers and
   * value labels are sliced to the range, the y-axis rescales and `details` still receives original indices.
   * A range naming an unknown category is ignored (full range shown) with a dev warning. Header buttons: "Zoom
   * to selection" while a selection exists, and "Reset zoom" whenever zoomed (also without selection enabled);
   * when controlled, they call `onZoomRangeChange`. Omit for uncontrolled.
   */
  zoomRange?: ChartRange | null;
  /** Initial zoomed range when uncontrolled. Default `null` (all categories). */
  defaultZoomRange?: ChartRange | null;
  /** Called with the next zoomed range (or `null` on reset) when the user clicks a zoom button. */
  onZoomRangeChange?: (range: ChartRange | null) => void;
  /**
   * Controlled render window inside the current domain (the `zoomRange` slice, else all categories): fractions
   * `{ from, to }` of the domain's band edges (0 = left edge of the first category, 1 = right edge of the last).
   * `null` = everything. Only the plot follows it (continuous x positions, marks clipped to the plot, x labels
   * and y axis from the visible categories); the data table, tooltip contents, keyboard inspection and markers
   * keep every category of the domain. Clamped to 0..1 and at least two categories. Any `zoomRange` change resets
   * it to `null`. Omit for uncontrolled.
   */
  viewport?: ChartViewport | null;
  /** Initial render window when uncontrolled. Default `null`. Resets to `null` when `categories` change content (new data). */
  defaultViewport?: ChartViewport | null;
  /**
   * Called with the next window (`null` = everything) when the user zooms or pans, "Reset zoom" clears it, or a
   * `zoomRange` change resets it. `end: true` once the change settles (each keyboard step, a button, a reset):
   * refetch finer data then.
   */
  onViewportChange?: (next: ChartViewport | null, info: { end: boolean }) => void;
  /**
   * Turns on interactive zooming of the `viewport`: Ctrl/⌘ + wheel and trackpad pinch zoom around the pointer;
   * Shift + wheel or a horizontal wheel pans while zoomed; a plain vertical wheel always scrolls the page. Touch:
   * two-finger pinch zooms and two-finger drag pans; a one-finger horizontal drag pans while zoomed; a vertical
   * swipe scrolls the page; a long-press still selects. Mouse drag pans while zoomed only when selection is off.
   * With the plot focused: `+` / `=` zoom in and `-` zooms out around the inspected category. (Moving the inspected
   * category past the window's edge pans to keep it visible whenever a viewport is set, with or without this.)
   * `onViewportChange` fires with `end: false` during a gesture and `end: true` when it settles. Default `false`.
   */
  zoomGestures?: boolean;
  /**
   * Called on a mouse double-click or a touch double-tap (two taps within 300ms and 24px) on the plot, and on
   * Enter while a category is inspected from the keyboard (`value: null`). Reports the nearest category's original
   * index, the domain fraction and the y value at the pointer, e.g. to add a marker there.
   */
  onPlotDoubleClick?: (e: ChartPlotPointerEvent) => void;
  /**
   * The x each category stands for (e.g. each day's start, as a `Date` or epoch ms), same length and order as
   * `categories`, ascending. Inside a `ChartSync` it syncs by value: a category covers `[value_i, value_i+1)` (the
   * last reuses the previous step), so charts with different labels or bucket sizes, and scatter charts, line
   * up. Without it the chart syncs only with other category charts, by exact category label. A wrong length is
   * ignored (label matching) with a dev warning.
   */
  categoryValues?: (number | Date)[];
  /**
   * Inside a `ChartSync`, `true` (default) joins the group: inspecting a category here shows a crosshair and tooltip
   * at the matching x in the other charts, and theirs show here. `false` opts this chart out. No effect outside
   * a `ChartSync`.
   */
  sync?: boolean;
}

const NO_MARKERS: ChartMarker[] = [];
const NO_REFERENCES: ChartReferenceLine[] = [];
const NO_ANNOTATIONS: ChartAnnotation[] = [];
const NO_DROPPED: string[] = [];
const identity = (i: number) => i;
/** Vertical room the clip leaves around the plot, so a top/bottom inspection marker and stroke are not cut. */
const CLIP_SLACK = MARKER_RADIUS + 2;
/** The header `Cluster gap="sm"` between the legend and the zoom buttons. */
const HEADER_GAP_PX = 8;

// Lifts descenders off the row below (or the plot top).
const GUTTER_DESCENT = 2;
const gutterBaseline = (row: number) => PAD_TOP + row * MARKER_LABEL_BASELINE - GUTTER_DESCENT;

// Marker label text in the marker's palette colour (class + variable); untouched without `color`.
const labelColor = (slot: number) =>
  slot ? { className: styles.markerLabelColored, 'data-slot': slot, style: seriesStyle(slot) } : {};

function useDevWarnings(dropped: string[], overflowCount: number, droppedMarkers: string[]) {
  const droppedKey = dropped.join('|');
  const droppedMarkersKey = droppedMarkers.join('|');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (droppedMarkersKey) {
      console.warn(
        `[Chart] Ignored markers (${droppedMarkersKey.split('|').join(', ')}): at/from/to must be one of categories.`,
      );
    }
  }, [droppedMarkersKey]);
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

/**
 * Time-series chart (line, bar, stacked bar, area) that fills a `DashboardWidget variant="chart"` body.
 * @see docs/components/Chart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name (incl. aria-labelledby) always win.
export const Chart = forwardRef<HTMLElement, ChartProps>(function Chart(
  {
    type,
    label,
    categories: allCategories,
    series: allSeries,
    formatValue,
    curve,
    emptyMessage,
    hiddenSeries,
    onHiddenSeriesChange,
    markers = NO_MARKERS,
    referenceLines = NO_REFERENCES,
    annotations = NO_ANNOTATIONS,
    footnote,
    details,
    valueLabels,
    includeZero,
    integerValues,
    selectedRange,
    defaultSelectedRange,
    onSelectedRangeChange,
    selectOn = 'drag',
    zoomRange,
    defaultZoomRange,
    onZoomRangeChange,
    viewport,
    defaultViewport,
    onViewportChange,
    zoomGestures = false,
    onPlotDoubleClick,
    categoryValues,
    sync: syncEnabled = true,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const domain = useChartDomain({
    categories: allCategories,
    zoomRange,
    defaultZoomRange,
    onZoomRangeChange,
    viewport,
    defaultViewport,
    onViewportChange,
  });
  const { zoomIdx, loaded, vp } = domain;
  const zoomFrom = zoomIdx?.from;
  const zoomTo = zoomIdx?.to;
  // Everything below works on the zoomed view; `originalIndex` maps back for index-based callbacks.
  const view = useMemo(
    () =>
      zoomFrom === undefined || zoomTo === undefined
        ? { categories: allCategories, series: allSeries, markers, originalIndex: identity }
        : sliceForZoom(allCategories, allSeries, markers, { from: zoomFrom, to: zoomTo }),
    [allCategories, allSeries, markers, zoomFrom, zoomTo],
  );
  const { categories, series, originalIndex } = view;
  const resolved = useMemo(
    () => resolveSeries(type, series, categories.length),
    [type, series, categories.length],
  );
  const resolvedMarkers = useMemo(
    () => resolveMarkers(view.markers, categories),
    [view.markers, categories],
  );
  useDevWarnings(
    resolved.dropped,
    resolved.overflowCount,
    loaded ? resolvedMarkers.dropped : NO_DROPPED,
  );
  // Finite lines with their index-based key and dash (the layout drops the rest the same way).
  const references = referenceLines.flatMap((r, i) =>
    Number.isFinite(r.value)
      ? [{ ...r, key: r.key ?? String(i), dash: i % REFERENCE_DASHES, text: formatValue(r.value) }]
      : [],
  );
  const brokenReferences = referenceLines
    .filter((r) => !Number.isFinite(r.value))
    .map((r) => r.label)
    .join(', ');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !brokenReferences) return;
    console.warn(`[Chart] Ignored referenceLines (${brokenReferences}): value must be finite.`);
  }, [brokenReferences]);
  const referenceNotes = references.map((r) => `${r.label}: ${r.text}`);
  // Resolved on the full categories (so an out-of-zoom one is not "unknown"), then shifted into the view.
  const allAnnotations = useMemo(
    () => resolveAnnotations(annotations, allCategories),
    [annotations, allCategories],
  );
  const viewAnnotations = useMemo(() => {
    const from = zoomFrom ?? 0;
    return allAnnotations.annotations.flatMap((a) =>
      a.index >= from && a.index - from < categories.length
        ? [{ ...a, index: a.index - from }]
        : [],
    );
  }, [allAnnotations, zoomFrom, categories.length]);
  const droppedAnnotations = loaded ? allAnnotations.dropped.join(', ') : '';
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !droppedAnnotations) return;
    console.warn(
      `[Chart] Ignored annotations (${droppedAnnotations}): at must be one of categories.`,
    );
  }, [droppedAnnotations]);

  const [rawHidden, setHidden] = useControllableState<string[]>({
    value: hiddenSeries,
    defaultValue: [],
    onChange: onHiddenSeriesChange,
  });
  // A controlled set can hide every primary: ignore it for primaries so the plot is never blank.
  const hidden = useMemo(() => {
    const primaries = resolved.series.filter((s) => s.comparisonOf === undefined);
    return primaries.length > 0 && primaries.every((s) => rawHidden.includes(s.key))
      ? rawHidden.filter((k) => !primaries.some((s) => s.key === k))
      : rawHidden;
  }, [resolved.series, rawHidden]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusKey = hoverKey ?? focusedKey;
  const hintId = useId();
  const clipId = useId();
  const statusId = useId();
  const footnoteId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={styles.footnote}>
      {footnote}
    </div>
  );
  const visible = useMemo(() => visibleSeries(resolved.series, hidden), [resolved.series, hidden]);
  // Never empty while zoomed: an all-null window still draws, so "Reset zoom" stays reachable.
  const empty = zoomIdx === null && isEmpty(categories, resolved.series);

  const [setPlotEl, size, plotEl] = useSize<HTMLDivElement>();
  const [setRootEl, rootSize, rootEl] = useSize<HTMLElement>();
  const [setZoomEl, zoomSize] = useSize<HTMLElement>();
  const figureRef = useMemo(
    () => mergeRefs(ref, (el: HTMLElement | null) => setRootEl(el)),
    [ref, setRootEl],
  );
  const compact = rootSize.height > 0 && rootSize.height < COMPACT_HEIGHT;
  // Compact charts hide marker text, icons included, so they reserve no gutter for it.
  const gutterRows = compact ? 0 : markerGutterRows(resolvedMarkers.markers);
  const gutterGap = compact ? 0 : markerGutterGap(resolvedMarkers.markers);
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
            curve,
            valueLabels,
            includeZero,
            integerValues,
            topGutter: gutterRows * MARKER_LABEL_BASELINE + gutterGap,
            viewport: vp,
            referenceLines,
            annotations: viewAnnotations,
          })
        : null,
    [
      empty,
      size.width,
      size.height,
      type,
      categories,
      visible,
      formatValue,
      curve,
      valueLabels,
      includeZero,
      integerValues,
      gutterRows,
      gutterGap,
      vp,
      referenceLines,
      viewAnnotations,
    ],
  );

  const markerGeometry = useMemo(
    () => (layout ? layoutMarkers(resolvedMarkers.markers, layout) : []),
    [layout, resolvedMarkers.markers],
  );

  const sync = useChartSync(syncEnabled);
  const badValues = categoryValues !== undefined && categoryValues.length !== allCategories.length;
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !badValues) return;
    console.warn(
      '[Chart] Ignored categoryValues: it must have one value per category. Syncing by category label instead.',
    );
  }, [badValues]);
  const unordered = useMemo(
    () => !!categoryValues?.some((v, i) => i > 0 && Number(v) <= Number(categoryValues[i - 1])),
    [categoryValues],
  );
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !unordered) return;
    console.warn(
      '[Chart] categoryValues must be strictly ascending; synced matching will be wrong.',
    );
  }, [unordered]);

  const ix = useChartInteraction({
    domain,
    layout,
    plotEl,
    rootEl,
    empty,
    selectedRange,
    defaultSelectedRange,
    onSelectedRangeChange,
    selectOn,
    zoomGestures,
    onPlotDoubleClick,
  });
  const {
    selectable,
    current,
    activeSource,
    selectedIdx,
    hasSelection,
    draft,
    point,
    statusText,
    zoomText,
    selectionNote,
    zoomNote,
    zoomed,
    zoomToSelection,
    resetZoom,
  } = ix;

  // Publish this chart's inspected moment after commit, whenever it changes: a new index, a clear, or new data
  // (categories / categoryValues) under the same index. Keyed by content, so an unchanged point is not re-sent.
  const own =
    current === null ? null : categoryPoint(originalIndex(current), allCategories, categoryValues);
  const ownKey = own && `${own.label}\0${own.from}\0${own.to}`;
  const published = useRef<{ key: string | null; publish: typeof sync.publish }>({
    key: null,
    publish: sync.publish,
  });
  useEffect(() => {
    if (published.current.key === ownKey && published.current.publish === sync.publish) return;
    published.current = { key: ownKey, publish: sync.publish };
    sync.publish(own);
  });

  // Another chart's inspected moment, echoed here (visual only) while this chart inspects nothing itself. Off the
  // zoom window or the viewport: nothing, the chart does not pan.
  const matched =
    sync.echo && layout && current === null
      ? matchCategory(sync.echo, allCategories, categoryValues)
      : null;
  const echoAt = matched === null ? -1 : matched - (zoomFrom ?? 0);
  const echoX = layout?.categoryX[echoAt];
  const echo =
    layout &&
    echoX !== undefined &&
    echoX >= layout.plot.x &&
    echoX <= layout.plot.x + layout.plot.width
      ? echoAt
      : null;
  const echoY = echo === null ? undefined : layout?.plot.y;
  const echoPoint = useMemo(
    () => (echoX === undefined || echoY === undefined ? null : { x: echoX, y: echoY }),
    [echoX, echoY],
  );
  /** The category drawn as inspected: this chart's own, else the echo. */
  const shown = current ?? echo;
  const echoAttr = echo === null ? undefined : '';

  const parentLabel = (s: ResolvedSeries) =>
    resolved.series.find((p) => p.key === s.comparisonOf)?.label;
  // Same label as the table header, so a comparison always names its parent.
  const columnHeader = (s: ResolvedSeries) =>
    parentLabel(s) ? `${s.label} (${parentLabel(s)})` : s.label;

  const rows =
    shown === null
      ? []
      : visible.map((s) => ({
          key: s.key,
          label: s.label,
          slot: s.slot,
          comparison: s.comparisonOf !== undefined,
          value:
            s.values[shown] === null ? t('chart.noData') : formatValue(s.values[shown] as number),
        }));

  const notes =
    shown === null
      ? []
      : [
          ...markerLabelsAt(resolvedMarkers.markers, shown),
          ...annotationLabelsAt(viewAnnotations, shown),
          ...referenceNotes,
        ];
  // `details` takes original indices: both call sites (here and the table's `detailsAt`) map through `originalIndex`.
  const detailLines = shown === null ? [] : (details?.(originalIndex(shown)) ?? []);
  const liveText = selectionNote
    ? selectionNote
    : zoomNote
      ? zoomNote
      : activeSource === 'keyboard' && current !== null
        ? `${categories[current]}: ${visible
            .map((s, i) => `${columnHeader(s)} ${rows[i].value}`)
            .join(
              ', ',
            )}${notes.length ? `. ${notes.join(', ')}` : ''}${detailLines.length ? `. ${detailLines.join(', ')}` : ''}`
        : '';
  const known = hidden.filter((k) => resolved.series.some((s) => s.key === k));
  const visiblePrimaries = resolved.series.filter(
    (s) => s.comparisonOf === undefined && !hidden.includes(s.key),
  );
  const toggle = (key: string) => {
    if (known.includes(key)) {
      setHidden(known.filter((k) => k !== key));
      return;
    }
    const target = resolved.series.find((s) => s.key === key);
    // Never hide the last primary series: an empty plot is a dead end.
    if (target?.comparisonOf === undefined && visiblePrimaries.length <= 1) return;
    setHidden([...known, key]);
  };
  // A focused/hovered button can vanish (hidden, collapsed); never dim everything for a stale key.
  const activeKey = focusKey !== null && visible.some((s) => s.key === focusKey) ? focusKey : null;
  const dimmed = (key: string) =>
    activeKey !== null &&
    key !== activeKey &&
    resolved.series.find((s) => s.key === key)?.comparisonOf !== activeKey
      ? ''
      : undefined;

  const legendItems = [
    ...resolved.series.map((s) => ({
      key: s.key,
      label: s.label,
      slot: s.slot,
      comparison: s.comparisonOf !== undefined,
      overflow: s.overflow,
      locked:
        s.comparisonOf === undefined && visiblePrimaries.length === 1 && visiblePrimaries[0] === s,
      parentLabel: parentLabel(s),
      parentHidden:
        s.comparisonOf !== undefined &&
        s.comparisonOf !== 'total' &&
        hidden.includes(s.comparisonOf),
    })),
    // Static, untoggleable entries with the line's own dash, as in ScatterChart.
    ...references.map((r) => ({
      key: `\0reference:${r.key}`,
      label: r.label,
      slot: r.color ?? 0,
      dash: r.dash,
      emphasis: r.emphasis === 'strong' ? ('strong' as const) : undefined,
      comparison: true,
      overflow: false,
      locked: false,
      parentHidden: false,
      static: true,
    })),
  ];

  const columns = visible.map((s) => ({
    key: s.key,
    header: columnHeader(s),
    values: s.values,
  }));

  // The in-progress drag wins over the committed selection; same band geometry as `markers`.
  const shownRange = draft ?? selectedIdx;
  const selectionGeometry =
    layout && shownRange
      ? layoutMarkers(
          [
            {
              key: 'selection',
              kind: 'band',
              tone: 'neutral',
              slot: 0,
              placement: 'beside',
              ...shownRange,
            },
          ],
          layout,
        )[0]
      : null;

  const clip = vp ? `url(#${clipId})` : undefined;
  const zoomButtons = (hasSelection || zoomed) && (
    <Cluster ref={setZoomEl} gap="xs">
      {zoomed && (
        <Button size="xs" variant="ghost" onClick={resetZoom}>
          {t('chart.resetZoom')}
        </Button>
      )}
      {hasSelection && (
        <Button size="xs" variant="ghost" onClick={zoomToSelection}>
          {t('chart.zoomToSelection')}
        </Button>
      )}
    </Cluster>
  );

  const legendEl =
    legendItems.length > 1 ? (
      <ChartLegend
        items={legendItems}
        hidden={hidden}
        // Compact: the zoom buttons share the row, so the legend fits into what they leave.
        fitWidth={
          compact ? rootSize.width - (zoomButtons ? zoomSize.width + HEADER_GAP_PX : 0) : undefined
        }
        onToggle={toggle}
        onHoverKey={setHoverKey}
        onFocusKey={setFocusedKey}
      />
    ) : (
      <span />
    );

  const seriesMarks = (m: SeriesMarks, part: 'all' | 'fill' | 'stroke' = 'all') =>
    renderSeriesMarks(m, part, dimmed(m.key));
  // Without reference lines the series pass is one group per series, as before.
  const splitAreas = !!layout && layout.referenceLines.length > 0;

  if (empty) {
    return (
      <figure
        // Focus target when "Reset zoom" lands here; not a tab stop.
        tabIndex={-1}
        {...rest}
        ref={figureRef}
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
      ref={figureRef}
      role="figure"
      aria-label={label}
      aria-labelledby={undefined}
      data-compact={compact || undefined}
      data-footnote={hasFootnote || undefined}
      className={clsx(styles.root, className)}
    >
      {/* Header row: the legend, plus the zoom buttons at the end while they apply. One wrapper either way,
          so the legend (and a focused legend button) is not remounted when the buttons come and go. */}
      <Cluster justify="between" gap="sm">
        {legendEl}
        {zoomButtons}
      </Cluster>
      <VisuallyHidden id={statusId}>{statusText}</VisuallyHidden>
      <VisuallyHidden id={hintId}>
        {[
          t('chart.keyboardHint'),
          selectable && t('chart.rangeHint'),
          zoomGestures && t('chart.zoomHint'),
        ]
          .filter(Boolean)
          .join(' ')}
      </VisuallyHidden>
      <div
        ref={setPlotEl}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={[statusText && statusId, hintId, hasFootnote && footnoteId]
          .filter(Boolean)
          .join(' ')}
        tabIndex={0}
        data-selectable={selectable || undefined}
        data-pannable={(zoomGestures && !selectable && vp !== null) || undefined}
        {...ix.plotHandlers}
      >
        {layout && (
          <svg
            className={styles.svg}
            width={size.width}
            height={size.height}
            aria-hidden="true"
            focusable="false"
          >
            {clip && (
              <clipPath id={clipId}>
                <rect
                  x={layout.plot.x}
                  y={layout.plot.y - CLIP_SLACK}
                  width={layout.plot.width}
                  height={layout.plot.height + 2 * CLIP_SLACK}
                />
              </clipPath>
            )}
            {/* Bands sit under the grid and data; lines under the data, labels over it. */}
            <g className={styles.markers} clipPath={clip}>
              {markerGeometry.map(
                (m) =>
                  m.kind === 'band' && (
                    <rect
                      key={m.key}
                      className={styles.markerBand}
                      data-tone={m.tone}
                      data-slot={m.slot || undefined}
                      style={m.slot ? seriesStyle(m.slot) : undefined}
                      x={m.x}
                      y={layout.plot.y}
                      width={m.width}
                      height={layout.plot.height}
                    />
                  ),
              )}
              {selectionGeometry && (
                <rect
                  className={styles.selection}
                  data-selection=""
                  x={selectionGeometry.x}
                  y={layout.plot.y}
                  width={selectionGeometry.width}
                  height={layout.plot.height}
                />
              )}
            </g>
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
            {/* With a viewport, everything drawn at category positions is clipped to the plot. */}
            <g clipPath={clip}>
              {shown !== null &&
                (type === 'bar' || type === 'stacked-bar' ? (
                  <rect
                    className={styles.band}
                    data-echo={echoAttr}
                    x={layout.categoryX[shown] - layout.step / 2}
                    y={layout.plot.y}
                    width={layout.step}
                    height={layout.plot.height}
                  />
                ) : (
                  <line
                    className={styles.crosshair}
                    data-echo={echoAttr}
                    x1={layout.categoryX[shown]}
                    x2={layout.categoryX[shown]}
                    y1={layout.plot.y}
                    y2={layout.plot.y + layout.plot.height}
                  />
                ))}
              <g className={styles.markers}>
                {markerGeometry.map(
                  (m) =>
                    m.kind === 'line' && (
                      <line
                        key={m.key}
                        className={styles.markerLine}
                        data-tone={m.tone}
                        data-slot={m.slot || undefined}
                        style={m.slot ? seriesStyle(m.slot) : undefined}
                        x1={m.x}
                        x2={m.x}
                        y1={layout.plot.y}
                        y2={layout.plot.y + layout.plot.height}
                      />
                    ),
                )}
              </g>
              {layout.marks.filter((m) => m.kind === 'bars').map((m) => seriesMarks(m))}
              {splitAreas &&
                layout.marks.filter((m) => m.kind === 'area').map((m) => seriesMarks(m, 'fill'))}
              {/* Over bars and area fills, under line strokes, dots and inspection markers. */}
              {renderReferenceLines(layout.referenceLines)}
              {layout.marks
                .filter((m) => m.kind !== 'bars')
                .map((m) => seriesMarks(m, splitAreas ? 'stroke' : 'all'))}
              {layout.valueLabels.length > 0 && (
                <g className={styles.valueLabels}>
                  {layout.valueLabels.map((v, i) => (
                    <text
                      key={i}
                      data-value-label
                      aria-hidden="true"
                      x={v.x}
                      y={v.y}
                      textAnchor="middle"
                    >
                      {v.text}
                    </text>
                  ))}
                </g>
              )}
              {/* Glyphs above the data marks, with the value labels. */}
              {renderAnnotations(layout.annotations)}
              {/* Inspection markers in their own pass: a later stacked area would paint over them. */}
              {shown !== null &&
                layout.marks.map(
                  (m) =>
                    m.kind !== 'bars' &&
                    m.points[shown] && (
                      <g
                        key={m.key}
                        className={styles.series}
                        style={seriesStyle(m.slot)}
                        data-dimmed={dimmed(m.key)}
                      >
                        <path
                          className={styles.marker}
                          d={markerPath(
                            markerShape(m.slot),
                            m.points[shown]!.x,
                            m.points[shown]!.y,
                            MARKER_RADIUS,
                          )}
                        />
                      </g>
                    ),
                )}
            </g>
            {!compact && (
              <g className={styles.markerLabels}>
                <g clipPath={clip}>
                  {markerGeometry.map(
                    (m) =>
                      m.label && (
                        <text
                          key={m.key}
                          x={m.label.x}
                          y={layout.plot.y + MARKER_LABEL_BASELINE}
                          textAnchor={m.label.anchor}
                          {...labelColor(m.slot)}
                        >
                          {m.label.text}
                        </text>
                      ),
                  )}
                </g>
                {/* Gutter above the plot: icons in the first row, top labels in the last. */}
                {markerGeometry.map(
                  (m) =>
                    m.top && (
                      <Fragment key={`top-${m.key}`}>
                        {m.top.icon && (
                          <text
                            className={styles.markerIcon}
                            aria-hidden="true"
                            x={m.top.x}
                            y={gutterBaseline(1)}
                            textAnchor="middle"
                          >
                            {m.top.icon}
                          </text>
                        )}
                        {m.top.label && (
                          <text
                            x={m.top.x}
                            y={gutterBaseline(gutterRows) + gutterGap}
                            textAnchor="middle"
                            {...labelColor(m.slot)}
                          >
                            {m.top.label}
                          </text>
                        )}
                      </Fragment>
                    ),
                )}
              </g>
            )}
          </svg>
        )}
      </div>
      {footnoteEl}
      <ChartTooltip
        anchor={plotEl}
        point={point ?? echoPoint}
        echo={echo !== null}
        title={shown === null ? '' : categories[shown]}
        rows={rows}
        notes={notes}
        details={detailLines}
      />
      <LiveRegion>{liveText}</LiveRegion>
      <ChartTable
        caption={zoomText ? `${label}. ${zoomText}` : label}
        categoryHeader={t('chart.category')}
        noData={t('chart.noData')}
        categories={categories}
        columns={columns}
        formatValue={formatValue}
        notesHeader={t('chart.notes')}
        markers={resolvedMarkers.markers}
        annotations={viewAnnotations}
        detailsHeader={details ? t('chart.details') : undefined}
        detailsAt={(i) => details?.(originalIndex(i)) ?? []}
        references={references}
      />
    </figure>
  );
});
