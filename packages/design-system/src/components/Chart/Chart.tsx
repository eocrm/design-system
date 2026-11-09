import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
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
import { LONG_PRESS_MS, pastSlop } from '../_internal/longPress';
import { rangeFromIndices, resolveRange, sliceForZoom, type ChartRange } from './chartRange';
import {
  categoryIndexAt,
  computeLayout,
  markerPath,
  markerShape,
  COMPACT_HEIGHT,
  isEmpty,
  layoutMarkers,
  markerGutterRows,
  markerLabelsAt,
  resolveMarkers,
  REFERENCE_DASHES,
  DOT_RADIUS,
  PAD_TOP,
  MARKER_LABEL_BASELINE,
  MARKER_RADIUS,
  LABEL_GAP,
  PALETTE_SIZE,
  X_LABEL_BASELINE,
  resolveSeries,
  visibleSeries,
  type ChartCurve,
  type ChartMarker,
  type ChartReferenceLine,
  type ChartSeries,
  type ChartType,
  type ResolvedSeries,
  type SeriesMarks,
} from './chartModel';
import {
  clampViewport,
  domainFractionAt,
  ensureVisible,
  visibleIndexRange,
  zoomViewport,
  type ChartViewport,
} from './chartViewport';
import { useChartGestures } from './useChartGestures';
import styles from './Chart.module.scss';

export type {
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
   * width, over bars and under lines/areas, always inside the y domain (also when zoomed). Neutral ink unless `color`
   * (palette slot 1–8) is set; each line's array index picks its dash pattern (cycling after three), so keep the
   * order stable. Each gets a static legend entry, a muted "label: value" row (via `formatValue`) in the tooltip and
   * the keyboard announcement, and a row in the data table's footer. A non-finite `value` is ignored with a dev warning.
   */
  referenceLines?: ChartReferenceLine[];
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
}

const NO_MARKERS: ChartMarker[] = [];
const NO_REFERENCES: ChartReferenceLine[] = [];
const NO_DROPPED: string[] = [];
const identity = (i: number) => i;
/** Span multiplier of one `+` key press (`-` divides by it). */
const KEY_ZOOM = 0.5;
/** Vertical room the clip leaves around the plot, so a top/bottom inspection marker and stroke are not cut. */
const CLIP_SLACK = MARKER_RADIUS + 2;
const sameViewport = (a: ChartViewport | null, b: ChartViewport | null) =>
  a === b || (!!a && !!b && a.from === b.from && a.to === b.to);
/** The header `Cluster gap="sm"` between the legend and the zoom buttons. */
const HEADER_GAP_PX = 8;

/** Dev-only, once per distinct value: an invalid range is ignored rather than thrown. */
function useRangeWarning(prop: string, range: ChartRange | null | undefined, invalid: boolean) {
  const key = invalid && range ? `${range.from}|${range.to}` : '';
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !key) return;
    console.warn(
      `[Chart] Ignored ${prop} (${key.replace('|', ' to ')}): from/to must be one of categories.`,
    );
  }, [prop, key]);
}

// Lifts descenders off the row below (or the plot top).
const GUTTER_DESCENT = 2;
const gutterBaseline = (row: number) => PAD_TOP + row * MARKER_LABEL_BASELINE - GUTTER_DESCENT;

const seriesStyle = (slot: number) =>
  ({
    '--chart-series-color':
      slot === 0 ? 'var(--chart-total-comparison)' : `var(--chart-series-${slot})`,
  }) as CSSProperties;

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
    footnote,
    details,
    valueLabels,
    selectedRange,
    defaultSelectedRange,
    onSelectedRangeChange,
    zoomRange,
    defaultZoomRange,
    onZoomRangeChange,
    viewport,
    defaultViewport,
    onViewportChange,
    zoomGestures = false,
    onPlotDoubleClick,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const selectable =
    selectedRange !== undefined ||
    defaultSelectedRange !== undefined ||
    onSelectedRangeChange !== undefined;
  const [zoom, setZoom] = useControllableState<ChartRange | null>({
    value: zoomRange,
    defaultValue: defaultZoomRange ?? null,
    onChange: onZoomRangeChange,
  });
  const zoomIdx = resolveRange(zoom, allCategories);
  // No categories yet (loading): every range would "miss"; don't cry wolf.
  const loaded = allCategories.length > 0;
  useRangeWarning('zoomRange', zoom, loaded && zoomIdx === null);
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
  // Render window over the view; no `onChange` here: `changeViewport` adds the `{ end }` info itself.
  const [rawViewport, setViewportState] = useControllableState<ChartViewport | null>({
    value: viewport,
    defaultValue: defaultViewport ?? null,
  });
  const changeViewport = (next: ChartViewport | null, end: boolean) => {
    setViewportState(next);
    onViewportChange?.(next, { end });
  };
  const vFrom = rawViewport?.from;
  const vTo = rawViewport?.to;
  const n = categories.length;
  const vp = useMemo(
    () =>
      vFrom === undefined || vTo === undefined ? null : clampViewport({ from: vFrom, to: vTo }, n),
    [vFrom, vTo, n],
  );
  // New data (categories with other content) drops an uncontrolled window silently: notifying would make an app
  // that refetches on change undo the finer data it just swapped in. A controlled window is the app's to set.
  const categoriesKey = allCategories.join('\u0000');
  const [viewportDataKey, setViewportDataKey] = useState(categoriesKey);
  if (viewportDataKey !== categoriesKey) {
    setViewportDataKey(categoriesKey);
    // The first data after loading (no categories yet) is not new data: it keeps `defaultViewport`.
    if (viewport === undefined && viewportDataKey !== '') setViewportState(null);
  }
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

  const [selection, setSelection] = useControllableState<ChartRange | null>({
    value: selectedRange,
    defaultValue: defaultSelectedRange ?? null,
    onChange: onSelectedRangeChange,
  });
  useRangeWarning(
    'selectedRange',
    selection,
    loaded && resolveRange(selection, allCategories) === null,
  );
  const selectionIdx = selectable ? resolveRange(selection, allCategories) : null;
  const hasSelection = selectionIdx !== null;
  // Clipped to the zoom window, in view indices. The part outside is not drawn and a click there clears,
  // but the selection still exists (Escape clears it, and it can be zoomed to).
  const viewFrom = zoomFrom ?? 0;
  const clipFrom = Math.max(selectionIdx?.from ?? 0, viewFrom);
  const clipTo = Math.min(selectionIdx?.to ?? -1, zoomTo ?? allCategories.length - 1);
  const selectedIdx =
    selectionIdx && clipFrom <= clipTo
      ? { from: clipFrom - viewFrom, to: clipTo - viewFrom }
      : null;
  const selectedText = (r: ChartRange) =>
    r.from === r.to
      ? t('chart.selectedOne', { category: r.from })
      : t('chart.selected', { from: r.from, to: r.to });
  // Persistent zoom and selection, in the plot's description (Hard rule 10: a state the user arrives at).
  const zoomedText = (from: string, to: string) =>
    from === to ? t('chart.zoomedOne', { category: from }) : t('chart.zoomed', { from, to });
  // The table caption names the domain (the table lists all of it); the plot names what it shows.
  const zoomText = zoomIdx
    ? zoomedText(allCategories[zoomIdx.from], allCategories[zoomIdx.to])
    : '';
  const shownIdx = vp && visibleIndexRange(vp, n);
  const plotZoomText = shownIdx
    ? zoomedText(categories[shownIdx.from], categories[shownIdx.to])
    : zoomText;
  const statusText = [
    plotZoomText,
    selectionIdx &&
      selectedText(rangeFromIndices(selectionIdx.from, selectionIdx.to, allCategories)),
  ]
    .filter(Boolean)
    .map((part) => `${part}.`)
    .join(' ');
  // Last user selection change, announced until keyboard inspection takes over the live region.
  const [selectionNote, setSelectionNote] = useState('');
  const select = (next: ChartRange | null) => {
    setSelection(next);
    setSelectionNote(next === null ? t('chart.selectionCleared') : selectedText(next));
    setZoomNote('');
  };
  // Hard rule 10: a keyboard zoom says what the plot shows now. Written when the rendered window actually changes
  // (a controlled `viewport` may keep or adjust it), so a no-op zoom is silent; any other window change (wheel,
  // pan, Reset zoom, zoomRange, new data) clears it, so the same text later is heard again.
  const [zoomNote, setZoomNote] = useState('');
  const [keyZoomFrom, setKeyZoomFrom] = useState<string | null>(null);
  const windowKey = `${zoomFrom}|${zoomTo}|${n}|${vp ? `${vp.from}|${vp.to}` : ''}`;
  const [noteWindowKey, setNoteWindowKey] = useState(windowKey);
  if (noteWindowKey !== windowKey || keyZoomFrom !== null) {
    setNoteWindowKey(windowKey);
    setKeyZoomFrom(null);
    const shown = visibleIndexRange(vp, n);
    const changed = noteWindowKey !== windowKey;
    if (keyZoomFrom !== null && keyZoomFrom !== windowKey && n > 0)
      setZoomNote(zoomedText(categories[shown.from], categories[shown.to]));
    else if (changed) setZoomNote('');
  }

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
            topGutter: gutterRows * MARKER_LABEL_BASELINE,
            viewport: vp,
            referenceLines,
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
      gutterRows,
      vp,
      referenceLines,
    ],
  );

  const markerGeometry = useMemo(
    () => (layout ? layoutMarkers(resolvedMarkers.markers, layout) : []),
    [layout, resolvedMarkers.markers],
  );

  const [active, setActive] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | null>(null);
  const current = active !== null && active < n ? active : null;

  // Shift+arrow anchor: the category inspected when Shift was first used; any other key, any pointer
  // inspection and any zoom change drops it.
  const anchor = useRef<number | null>(null);
  const inspect = (index: number | null, source: 'pointer' | 'keyboard' | null) => {
    if (source !== 'keyboard') anchor.current = null;
    setActive(index);
    setActiveSource(index === null ? null : source);
  };
  // A zoom change (ours or the consumer's) re-indexes the view: stale indices would name other categories.
  // Reset during render, so no frame (tooltip, announcement) ever uses an index from the old view.
  const zoomKey = `${zoomFrom}|${zoomTo}`;
  const [inspectedZoomKey, setInspectedZoomKey] = useState(zoomKey);
  if (inspectedZoomKey !== zoomKey) {
    setInspectedZoomKey(zoomKey);
    setActive(null);
    setActiveSource(null);
  }
  useEffect(() => {
    anchor.current = null;
  }, [zoomKey]);
  // A zoomRange change re-bases the domain, so the window inside it no longer applies. Before paint, so the old
  // window never shows on the new domain; not during render, as it calls the consumer.
  const viewportZoomKey = useRef(zoomKey);
  useLayoutEffect(() => {
    if (viewportZoomKey.current === zoomKey) return;
    viewportZoomKey.current = zoomKey;
    if (rawViewport === null) return;
    setViewportState(null);
    onViewportChange?.(null, { end: true });
  }, [zoomKey, rawViewport, setViewportState, onViewportChange]);
  const clampIndex = (i: number) => Math.max(0, Math.min(n - 1, i));
  const rangeAt = (a: number, b: number) =>
    rangeFromIndices(clampIndex(a), clampIndex(b), categories);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const extending = selectable && e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');
    if (!extending && e.key !== 'Shift') anchor.current = null;
    const plainKey = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (zoomGestures && plainKey && (e.key === '+' || e.key === '=' || e.key === '-')) {
      e.preventDefault();
      // Around the inspected category's centre (as a fraction of the visible plot), else the middle.
      const at =
        current !== null && layout
          ? Math.max(
              0,
              Math.min(1, (layout.categoryX[current] - layout.plot.x) / layout.plot.width),
            )
          : 0.5;
      const next = zoomViewport(vp, e.key === '-' ? 1 / KEY_ZOOM : KEY_ZOOM, at, n);
      if (!sameViewport(next, vp)) {
        changeViewport(next, true);
        setSelectionNote('');
        setKeyZoomFrom(windowKey);
      }
      return;
    }
    if (
      e.key === 'Enter' &&
      onPlotDoubleClick &&
      current !== null &&
      layout &&
      anchorX !== undefined
    ) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      onPlotDoubleClick({
        index: originalIndex(current),
        fraction: (current + 0.5) / n,
        value: null,
        clientX: rect.left + anchorX,
        clientY: rect.top + layout.plot.y + layout.plot.height / 2,
        source: 'keyboard',
      });
      return;
    }
    let next: number | null;
    switch (e.key) {
      case 'ArrowRight':
        next = current === null ? 0 : Math.min(n - 1, current + 1);
        break;
      case 'ArrowLeft':
        next = current === null ? n - 1 : Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      case 'Escape':
        // Mid-drag, Escape cancels the gesture only: the release then commits nothing.
        if (press.current) {
          e.preventDefault();
          press.current = null;
          setDraft(null);
          return;
        }
        if (hasSelection) {
          e.preventDefault();
          select(null);
          return;
        }
        if (current === null) return; // let a surrounding dialog close
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (extending && next !== null) {
      anchor.current ??= current ?? next;
      select(rangeAt(anchor.current, next));
    } else {
      setSelectionNote('');
      setZoomNote('');
    }
    // Pan any window (app-set too) so keyboard inspection never lands off-screen.
    if (next !== null) {
      const panned = ensureVisible(vp, next, n);
      if (!sameViewport(panned, vp)) changeViewport(panned, true);
    }
    inspect(next, 'keyboard');
  };

  // A tap leaves the tooltip open (touch fires pointerleave right after pointerup, which
  // we ignore). Dismiss it on the next press outside the plot instead of relying on the
  // plot losing focus: mobile Safari does not reliably focus a tabIndex div on tap.
  const pointerActive = activeSource === 'pointer' && current !== null;
  useEffect(() => {
    if (!pointerActive || !plotEl) return;
    const dismiss = (e: Event) => {
      // composedPath, not target: inside a shadow root the target is retargeted to the host.
      if (e.composedPath().includes(plotEl)) return;
      setActive(null);
      setActiveSource(null);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [pointerActive, plotEl]);

  const indexAt = (e: PointerEvent<HTMLDivElement>) =>
    layout
      ? categoryIndexAt(layout, e.clientX - e.currentTarget.getBoundingClientRect().left)
      : null;

  // Mouse/pen selection: a press becomes a drag once it moves past the slop; a release without one is a click.
  // Touch: the press stays `pending` (a tap or a scroll) until it holds still for LONG_PRESS_MS, then it
  // lifts into a drag; moving past the slop first hands the gesture to the page (the browser pans).
  type Press = {
    id: number;
    index: number;
    x: number;
    y: number;
    dragging: boolean;
    touch?: 'pending' | 'lifted';
  };
  const press = useRef<Press | null>(null);
  const liftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // An unmount mid-press must not fire the lift on a detached plot.
  useEffect(() => () => clearTimeout(liftTimer.current), []);
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);

  // Reset zoom into all-null data swaps the plot for the EmptyState: keep focus in the figure.
  const refocusAfterReset = useRef(false);
  useEffect(() => {
    if (!refocusAfterReset.current) return;
    refocusAfterReset.current = false;
    if (empty) rootEl?.focus();
  });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    if (selectable && (e.pointerType === 'mouse' || e.pointerType === 'pen') && e.button === 0) {
      press.current = { id: e.pointerId, index, x: e.clientX, y: e.clientY, dragging: false };
    } else if (selectable && e.pointerType === 'touch' && !press.current) {
      const lifting: Press = {
        id: e.pointerId,
        index,
        x: e.clientX,
        y: e.clientY,
        dragging: false,
        touch: 'pending',
      };
      press.current = lifting;
      const plot = e.currentTarget;
      // Every teardown just drops `press`, so the timer checks identity instead of being cleared.
      liftTimer.current = setTimeout(() => {
        if (press.current !== lifting) return;
        lifting.touch = 'lifted';
        lifting.dragging = true;
        // Keep the moves and the release when the finger leaves the plot mid-drag.
        plot.setPointerCapture?.(lifting.id);
        setDraft({ from: lifting.index, to: lifting.index });
      }, LONG_PRESS_MS);
    }
    inspect(index, 'pointer');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    const p = press.current;
    if (p && p.id === e.pointerId && p.touch === 'pending') {
      // Past the slop before the timer: the page's scroll, not ours.
      if (pastSlop(e.clientX - p.x, e.clientY - p.y)) press.current = null;
    } else if (p && p.id === e.pointerId) {
      if (!p.dragging && pastSlop(e.clientX - p.x, e.clientY - p.y)) {
        p.dragging = true;
        // Keep receiving moves and the release when the pointer leaves the plot mid-drag.
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      if (p.dragging) setDraft({ from: Math.min(p.index, index), to: Math.max(p.index, index) });
    }
    inspect(index, 'pointer');
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    setDraft(null);
    const index = indexAt(e) ?? p.index;
    if (p.dragging) select(rangeAt(p.index, index));
    else if (
      hasSelection &&
      (selectedIdx === null || index < selectedIdx.from || index > selectedIdx.to)
    )
      select(null);
  };

  const onPointerCancel = () => {
    press.current = null;
    setDraft(null);
  };

  const firePlotDoubleClick = (clientX: number, clientY: number, source: 'mouse' | 'touch') => {
    if (!layout || !plotEl || !onPlotDoubleClick) return;
    const rect = plotEl.getBoundingClientRect();
    const x = clientX - rect.left;
    onPlotDoubleClick({
      index: originalIndex(categoryIndexAt(layout, x)),
      fraction: domainFractionAt(layout, x),
      value: layout.valueAt(clientY - rect.top),
      clientX,
      clientY,
      source,
    });
  };
  const gestures = useChartGestures({
    plotEl,
    layout,
    enabled: zoomGestures,
    selectable,
    viewport: vp,
    n,
    onChange: changeViewport,
    onDoubleClick: onPlotDoubleClick && firePlotDoubleClick,
    // A lifted long-press selection keeps the touch; otherwise a pending one gives way to the pan/pinch.
    claim: () => {
      if (press.current?.touch === 'lifted') return false;
      if (press.current?.touch === 'pending') press.current = null;
      return true;
    },
  });

  // Touch scroll suppression, as in DashboardCanvas (DS-15): the plot keeps `touch-action: pan-y` so a
  // swipe scrolls, and touch-action can't change mid-gesture, so a lifted press cancels its own
  // touchmoves instead. Bound non-passive for as long as selection is on (a browser may decide at
  // touchstart whether to wait for listeners). `contextmenu` is what a held finger would open.
  useEffect(() => {
    if (!selectable || !plotEl) return;
    const block = (e: Event) => {
      if (press.current?.touch === 'lifted') e.preventDefault();
    };
    plotEl.addEventListener('touchmove', block, { passive: false });
    plotEl.addEventListener('contextmenu', block);
    return () => {
      plotEl.removeEventListener('touchmove', block);
      plotEl.removeEventListener('contextmenu', block);
    };
  }, [selectable, plotEl]);

  const parentLabel = (s: ResolvedSeries) =>
    resolved.series.find((p) => p.key === s.comparisonOf)?.label;
  // Same label as the table header, so a comparison always names its parent.
  const columnHeader = (s: ResolvedSeries) =>
    parentLabel(s) ? `${s.label} (${parentLabel(s)})` : s.label;

  const rows =
    current === null
      ? []
      : visible.map((s) => ({
          key: s.key,
          label: s.label,
          slot: s.slot,
          comparison: s.comparisonOf !== undefined,
          value:
            s.values[current] === null
              ? t('chart.noData')
              : formatValue(s.values[current] as number),
        }));

  // Plot-local scalars so `point` keeps its identity until x/y change; the tooltip resolves viewport coords itself.
  // Kept on the plot: with a viewport the inspected category can be scrolled out of view.
  const anchorX =
    current !== null && layout
      ? Math.max(
          layout.plot.x,
          Math.min(layout.plot.x + layout.plot.width, layout.categoryX[current]),
        )
      : undefined;
  const anchorY = layout?.plot.y;
  const point = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  const notes =
    current === null
      ? []
      : [...markerLabelsAt(resolvedMarkers.markers, current), ...referenceNotes];
  // `details` takes original indices: both call sites (here and the table's `detailsAt`) map through `originalIndex`.
  const detailLines = current === null ? [] : (details?.(originalIndex(current)) ?? []);
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

  // The clicked button unmounts (zoom clears the selection; reset removes itself): keep focus on the plot.
  const zoomToSelection = () => {
    if (!selection) return;
    setZoom(selection);
    setSelection(null);
    setSelectionNote('');
    plotEl?.focus();
  };
  // Clears both in one action; the viewport first, so the zoomRange reset finds no window left to notify about.
  const resetZoom = () => {
    if (vp) changeViewport(null, true);
    if (zoomIdx !== null) setZoom(null);
    plotEl?.focus();
    refocusAfterReset.current = true;
  };
  const zoomed = zoomIdx !== null || vp !== null;
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

  const seriesMarks = (m: SeriesMarks) => (
    <g
      key={m.key}
      className={styles.series}
      style={seriesStyle(m.slot)}
      data-series={m.key}
      data-comparison={m.comparison || undefined}
      data-overflow={m.overflow || undefined}
      data-dimmed={dimmed(m.key)}
    >
      {m.area && <path className={styles.area} d={m.area} />}
      {m.line && <path className={styles.line} d={m.line} />}
      {m.bars?.map((d, i) => d && <path key={i} className={styles.bar} d={d} />)}
      {m.dots.map((p, i) => (
        <circle key={i} className={styles.dot} cx={p.x} cy={p.y} r={DOT_RADIUS} />
      ))}
    </g>
  );

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
        onKeyDown={onKeyDown}
        onPointerMove={(e) => {
          gestures.onPointerMove(e);
          onPointerMove(e);
        }}
        onPointerDown={(e) => {
          gestures.onPointerDown(e);
          onPointerDown(e);
        }}
        onPointerUp={(e) => {
          gestures.onPointerUp(e);
          onPointerUp(e);
        }}
        onPointerCancel={(e) => {
          gestures.onPointerUp(e);
          onPointerCancel();
        }}
        onDoubleClick={gestures.onDoubleClick}
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
              {current !== null &&
                (type === 'bar' || type === 'stacked-bar' ? (
                  <rect
                    className={styles.band}
                    x={layout.categoryX[current] - layout.step / 2}
                    y={layout.plot.y}
                    width={layout.step}
                    height={layout.plot.height}
                  />
                ) : (
                  <line
                    className={styles.crosshair}
                    x1={layout.categoryX[current]}
                    x2={layout.categoryX[current]}
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
              {layout.marks.filter((m) => m.kind === 'bars').map(seriesMarks)}
              {/* Over bars, under lines and areas. */}
              {layout.referenceLines.map((r) => (
                <line
                  key={r.key}
                  className={styles.referenceLine}
                  data-reference-line=""
                  data-dash={r.dash}
                  style={r.slot ? seriesStyle(r.slot) : undefined}
                  x1={r.x1}
                  x2={r.x2}
                  y1={r.y}
                  y2={r.y}
                />
              ))}
              {layout.marks.filter((m) => m.kind !== 'bars').map(seriesMarks)}
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
              {/* Inspection markers in their own pass: a later stacked area would paint over them. */}
              {current !== null &&
                layout.marks.map(
                  (m) =>
                    m.kind !== 'bars' &&
                    m.points[current] && (
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
                            m.points[current]!.x,
                            m.points[current]!.y,
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
                          <text x={m.top.x} y={gutterBaseline(gutterRows)} textAnchor="middle">
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
        point={point}
        title={current === null ? '' : categories[current]}
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
        markersHeader={t('chart.markers')}
        markers={resolvedMarkers.markers}
        detailsHeader={details ? t('chart.details') : undefined}
        detailsAt={(i) => details?.(originalIndex(i)) ?? []}
        references={references}
      />
    </figure>
  );
});
