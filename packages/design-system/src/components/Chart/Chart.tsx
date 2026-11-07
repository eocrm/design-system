import {
  forwardRef,
  useEffect,
  useId,
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
import { LONG_PRESS_SLOP_PX } from '../DashboardCanvas/DashboardCanvas';
import { rangeFromIndices, resolveRange, sliceForZoom, type ChartRange } from './chartRange';
import {
  categoryIndexAt,
  computeLayout,
  markerPath,
  markerShape,
  COMPACT_HEIGHT,
  isEmpty,
  layoutMarkers,
  markerLabelsAt,
  resolveMarkers,
  DOT_RADIUS,
  MARKER_LABEL_BASELINE,
  MARKER_RADIUS,
  LABEL_GAP,
  PALETTE_SIZE,
  X_LABEL_BASELINE,
  resolveSeries,
  visibleSeries,
  type ChartCurve,
  type ChartMarker,
  type ChartSeries,
  type ChartType,
  type ResolvedSeries,
} from './chartModel';
import styles from './Chart.module.scss';

export type {
  ChartCurve,
  ChartMarker,
  ChartMarkerTone,
  ChartSeries,
  ChartSeriesColor,
  ChartType,
} from './chartModel';
export type { ChartRange } from './chartRange';

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
   * `'neutral'` for events (the tone default) or `'subtle'` for recurring context. Labelled markers are also listed in the
   * tooltip, the keyboard announcement and the data table; unlabelled ones are decorative. A marker naming an
   * unknown category is ignored with a dev warning.
   */
  markers?: ChartMarker[];
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
   * past 8px selects, a click outside the band clears, Shift+←/→ extends from the inspected category and
   * Escape clears. A range naming an unknown category is ignored with a dev warning.
   */
  selectedRange?: ChartRange | null;
  /** Initial selection when uncontrolled. Default `null`. Also turns selection on. */
  defaultSelectedRange?: ChartRange | null;
  /** Called with the next selection (or `null` when cleared) on every user change. Also turns selection on. */
  onSelectedRangeChange?: (range: ChartRange | null) => void;
  /**
   * Controlled zoomed category range (`null` = all categories). While zoomed, categories, series, markers and
   * value labels are sliced to the range, the y-axis rescales and `details` still receives original indices.
   * A range naming an unknown category is ignored (full range shown) with a dev warning. Omit for uncontrolled:
   * a "Zoom to selection" button appears in the header while a selection exists, "Reset zoom" while zoomed.
   */
  zoomRange?: ChartRange | null;
  /** Initial zoomed range when uncontrolled. Default `null` (all categories). */
  defaultZoomRange?: ChartRange | null;
  /** Called with the next zoomed range (or `null` on reset) when the user clicks a zoom button. */
  onZoomRangeChange?: (range: ChartRange | null) => void;
}

const NO_MARKERS: ChartMarker[] = [];
const NO_DROPPED: string[] = [];
const identity = (i: number) => i;

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
    footnote,
    details,
    valueLabels,
    selectedRange,
    defaultSelectedRange,
    onSelectedRangeChange,
    zoomRange,
    defaultZoomRange,
    onZoomRangeChange,
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
  useDevWarnings(
    resolved.dropped,
    resolved.overflowCount,
    loaded ? resolvedMarkers.dropped : NO_DROPPED,
  );

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
  // Resolved against the view: a selection outside the zoomed range is simply not drawn.
  const selectedIdx = selectable ? resolveRange(selection, categories) : null;
  // Last user selection change, announced until keyboard inspection takes over the live region.
  const [selectionNote, setSelectionNote] = useState('');
  const select = (next: ChartRange | null) => {
    setSelection(next);
    setSelectionNote(
      next === null
        ? t('chart.selectionCleared')
        : next.from === next.to
          ? t('chart.selectedOne', { category: next.from })
          : t('chart.selected', { from: next.from, to: next.to }),
    );
  };

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
  const [setRootEl, rootSize] = useSize<HTMLElement>();
  const figureRef = useMemo(
    () => mergeRefs(ref, (el: HTMLElement | null) => setRootEl(el)),
    [ref, setRootEl],
  );
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
          })
        : null,
    [empty, size.width, size.height, type, categories, visible, formatValue, curve, valueLabels],
  );

  const markerGeometry = useMemo(
    () => (layout ? layoutMarkers(resolvedMarkers.markers, layout) : []),
    [layout, resolvedMarkers.markers],
  );

  const [active, setActive] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<'pointer' | 'keyboard' | null>(null);
  const n = categories.length;
  const current = active !== null && active < n ? active : null;

  const inspect = (index: number | null, source: 'pointer' | 'keyboard' | null) => {
    setActive(index);
    setActiveSource(index === null ? null : source);
  };

  // Shift+arrow anchor: the category inspected when Shift was first used; any other key drops it.
  const anchor = useRef<number | null>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const extending = selectable && e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft');
    if (!extending && e.key !== 'Shift') anchor.current = null;
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
        if (selectedIdx !== null) {
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
      select(rangeFromIndices(anchor.current, next, categories));
    } else {
      setSelectionNote('');
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
  // ponytail: touch (long-press) gets its own branch in onPointerDown (DS-23, Task 7).
  const press = useRef<{
    id: number;
    index: number;
    x: number;
    y: number;
    dragging: boolean;
  } | null>(null);
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    if (selectable && (e.pointerType === 'mouse' || e.pointerType === 'pen') && e.button === 0) {
      press.current = { id: e.pointerId, index, x: e.clientX, y: e.clientY, dragging: false };
    }
    inspect(index, 'pointer');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const index = indexAt(e);
    if (index === null) return;
    const p = press.current;
    if (p && p.id === e.pointerId) {
      if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP_PX) {
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
    if (p.dragging) select(rangeFromIndices(p.index, index, categories));
    else if (selectedIdx !== null && (index < selectedIdx.from || index > selectedIdx.to))
      select(null);
  };

  const onPointerCancel = () => {
    press.current = null;
    setDraft(null);
  };

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
  const anchorX = current !== null && layout ? layout.categoryX[current] : undefined;
  const anchorY = layout?.plot.y;
  const point = useMemo(
    () => (anchorX === undefined || anchorY === undefined ? null : { x: anchorX, y: anchorY }),
    [anchorX, anchorY],
  );

  const notes = current === null ? [] : markerLabelsAt(resolvedMarkers.markers, current);
  // `details` takes original indices: both call sites (here and the table's `detailsAt`) map through `originalIndex`.
  const detailLines = current === null ? [] : (details?.(originalIndex(current)) ?? []);
  const liveText = selectionNote
    ? selectionNote
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

  const legendItems = resolved.series.map((s) => ({
    key: s.key,
    label: s.label,
    slot: s.slot,
    comparison: s.comparisonOf !== undefined,
    overflow: s.overflow,
    locked:
      s.comparisonOf === undefined && visiblePrimaries.length === 1 && visiblePrimaries[0] === s,
    parentLabel: parentLabel(s),
    parentHidden:
      s.comparisonOf !== undefined && s.comparisonOf !== 'total' && hidden.includes(s.comparisonOf),
  }));
  const compact = rootSize.height > 0 && rootSize.height < COMPACT_HEIGHT;

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
          [{ key: 'selection', kind: 'band', tone: 'neutral', ...shownRange }],
          layout,
        )[0]
      : null;

  // The clicked button unmounts (zoom clears the selection; reset removes itself): keep focus on the plot.
  const zoomToSelection = () => {
    if (!selection) return;
    setZoom(selection);
    setSelection(null);
    setSelectionNote('');
    inspect(null, null);
    plotEl?.focus();
  };
  const resetZoom = () => {
    setZoom(null);
    inspect(null, null);
    plotEl?.focus();
  };
  const zoomButtons = (selectedIdx !== null || zoomIdx !== null) && (
    <Cluster gap="xs">
      {zoomIdx !== null && (
        <Button size="xs" variant="ghost" onClick={resetZoom}>
          {t('chart.resetZoom')}
        </Button>
      )}
      {selectedIdx !== null && (
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
        fitWidth={compact ? rootSize.width : undefined}
        onToggle={toggle}
        onHoverKey={setHoverKey}
        onFocusKey={setFocusedKey}
      />
    ) : (
      <span />
    );

  if (empty) {
    return (
      <figure
        {...rest}
        ref={ref}
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
      {/* Header row: the legend, plus the zoom buttons at the end while they apply. */}
      {zoomButtons ? (
        <Cluster justify="between" gap="sm">
          {legendEl}
          {zoomButtons}
        </Cluster>
      ) : (
        legendEl
      )}
      <VisuallyHidden id={hintId}>
        {selectable
          ? `${t('chart.keyboardHint')} ${t('chart.rangeHint')}`
          : t('chart.keyboardHint')}
      </VisuallyHidden>
      <div
        ref={setPlotEl}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={hasFootnote ? `${hintId} ${footnoteId}` : hintId}
        tabIndex={0}
        data-selectable={selectable || undefined}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
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
            {/* Bands sit under the grid and data; lines under the data, labels over it. */}
            <g className={styles.markers}>
              {markerGeometry.map(
                (m) =>
                  m.kind === 'band' && (
                    <rect
                      key={m.key}
                      className={styles.markerBand}
                      data-tone={m.tone}
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
                      x1={m.x}
                      x2={m.x}
                      y1={layout.plot.y}
                      y2={layout.plot.y + layout.plot.height}
                    />
                  ),
              )}
            </g>
            {layout.marks.map((m) => (
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
            ))}
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
            {!compact && (
              <g className={styles.markerLabels}>
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
        caption={label}
        categoryHeader={t('chart.category')}
        noData={t('chart.noData')}
        categories={categories}
        columns={columns}
        formatValue={formatValue}
        markersHeader={t('chart.markers')}
        markers={resolvedMarkers.markers}
        detailsHeader={details ? t('chart.details') : undefined}
        detailsAt={(i) => details?.(originalIndex(i)) ?? []}
      />
    </figure>
  );
});
