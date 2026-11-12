import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { EmptyState } from '../EmptyState';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeRefs } from '../_internal/refs';
import { useSize } from '../_internal/useSize';
import { ChartTable } from '../Chart/ChartTable';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { readPx } from '../Chart/readPx';
import { sliceForZoom, type ChartRange } from '../Chart/chartRange';
import type { ChartViewport } from '../Chart/chartViewport';
import type { ChartPlotPointerEvent, ChartSelectOn } from '../Chart/Chart';
import { useChartDomain } from '../Chart/useChartDomain';
import { useChartInteraction } from '../Chart/useChartInteraction';
import { useChartSync } from '../ChartSync/chartSyncStore';
import { categoryPoint, matchCategory } from '../ChartSync/chartSyncMatch';
import {
  annotationLabelsAt,
  MARKER_LABEL_BASELINE,
  markerGutterGap,
  markerGutterRows,
  markerLabelsAt,
  PAD_TOP,
  resolveAnnotations,
  resolveMarkers,
  type ChartMarker,
} from '../Chart/chartModel';
import { computeLaneLayout, laneSlot, type Lane } from './laneModel';
import { LaneChartPlot } from './LaneChartPlot';
import chartStyles from '../Chart/Chart.module.scss';
import styles from './LaneChart.module.scss';

export type { Lane, LaneType } from './laneModel';

export interface LaneChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Accessible name of the figure and plot, and caption of its data table, e.g. "Effects, last 90 days". Required. */
  label: string;
  /** X-axis buckets shared by every lane, already formatted by the app ("12 Jan"). `lanes[].values[i]` belongs to `categories[i]`. */
  categories: string[];
  /**
   * The measures, top to bottom (3–6 is the sweet spot). Each lane has its own y scale, unit (`formatValue`) and
   * type: `'bar'` / `'line'` split the height equally; `'dots'` lanes get a short fixed row
   * (`--lane-chart-dots-height`) and mark presence only (a dot where the value is > 0; the magnitude is in the
   * tooltip and table). Every lane shares the left edge, the category x positions and one x axis under the bottom lane.
   */
  lanes: Lane[];
  /**
   * Category markers (`Chart`'s `markers`) drawn through every lane: lines and bands span all lanes, each label is
   * drawn once in a gutter above the top lane (`labelPlacement` is always treated as `'top'`). Labelled markers are
   * listed in the tooltip, the announcement and the data table. A marker naming an unknown category is ignored with a dev warning.
   */
  markers?: ChartMarker[];
  /** EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". */
  emptyMessage?: ReactNode;
  /** Short note under the plot on its own row; also describes the plot for screen readers. Shown in the empty state too. */
  footnote?: ReactNode;
  /**
   * Extra plain-text lines for a category (`categoryIndex` indexes `categories`), e.g. `['235 kcal']`: muted rows in
   * the tooltip, appended to the announcement, and a "Details" column in the data table. Return `[]` for none.
   */
  details?: (categoryIndex: number) => string[];
  /**
   * Controlled selected category range (`null` = none), as `Chart`: one band across every lane. Passing this,
   * `defaultSelectedRange` or `onSelectedRangeChange` turns selection on (drag / long-press, Shift+←/→, Space, Escape).
   */
  selectedRange?: ChartRange | null;
  /** Initial selection when uncontrolled. Default `null`. Also turns selection on. */
  defaultSelectedRange?: ChartRange | null;
  /** Called with the next selection (or `null` when cleared) on every user change. Also turns selection on. */
  onSelectedRangeChange?: (range: ChartRange | null) => void;
  /**
   * What a plain click or tap does while selection is on. `'drag'` (default): inspects, outside the band clears.
   * `'tap'`: selects that one category (tapping it again clears), the phone flow. Drag and long-press still select a range.
   */
  selectOn?: ChartSelectOn;
  /** Controlled zoomed category range (`null` = all), as `Chart`: every lane is sliced and rescaled. Header buttons "Zoom to selection" / "Reset zoom". */
  zoomRange?: ChartRange | null;
  /** Initial zoomed range when uncontrolled. Default `null`. */
  defaultZoomRange?: ChartRange | null;
  /** Called with the next zoomed range (or `null` on reset) when the user clicks a zoom button. */
  onZoomRangeChange?: (range: ChartRange | null) => void;
  /** Controlled render window inside the current domain, as `Chart`'s `viewport`; one window moves every lane. Omit for uncontrolled. */
  viewport?: ChartViewport | null;
  /** Initial render window when uncontrolled. Default `null`. Resets to `null` when `categories` change content. */
  defaultViewport?: ChartViewport | null;
  /** Called with the next window when the user zooms or pans; `end: true` once the change settles. */
  onViewportChange?: (next: ChartViewport | null, info: { end: boolean }) => void;
  /** Turns on interactive zooming of the `viewport` (wheel, pinch, pan, `+` / `-`), as `Chart`. Default `false`. */
  zoomGestures?: boolean;
  /** Called on a double-click, double-tap or Enter on the plot, as `Chart`; `value` is always `null` (no single y scale). */
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
   * at the matching x in the other charts, and theirs show here across every lane. `false` opts this chart out. No
   * effect outside a `ChartSync`.
   */
  sync?: boolean;
}

const NO_MARKERS: ChartMarker[] = [];
/** Fallbacks (px) for the lane tokens where computed styles don't resolve (jsdom): `--space-5` / `--space-3` / `--space-4` / `--space-1`. */
const DOTS_HEIGHT = 20;
const LANE_GAP = 12;
const LABEL_HEIGHT = 16;
const DOT_RADIUS = 4;

function useDevWarnings(markers: string, annotations: string, references: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (markers)
      console.warn(
        `[LaneChart] Ignored markers (${markers}): at/from/to must be one of categories.`,
      );
    if (annotations)
      console.warn(
        `[LaneChart] Ignored annotations (${annotations}): at must be one of categories.`,
      );
    if (references)
      console.warn(`[LaneChart] Ignored referenceLines (${references}): value must be finite.`);
  }, [markers, annotations, references]);
}

/**
 * Several measures stacked in lanes, each with its own y scale, on one shared x axis: one chart, one tooltip, one selection.
 * @see docs/components/LaneChart.md
 */
// {...rest} FIRST (Pattern B) so the figure's role and accessible name always win.
export const LaneChart = forwardRef<HTMLElement, LaneChartProps>(function LaneChart(
  {
    label,
    categories: allCategories,
    lanes: allLanes,
    markers = NO_MARKERS,
    emptyMessage,
    footnote,
    details,
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
    name: 'LaneChart',
  });
  const { zoomIdx, loaded, vp, categories } = domain;
  const zoomFrom = zoomIdx?.from ?? 0;
  const zoomTo = zoomIdx?.to;
  // The zoomed view: every lane's values sliced to it (short arrays padded with gaps); markers clipped to it below.
  const n = categories.length;
  const lanes = useMemo(
    () =>
      allLanes.map((l) => ({
        ...l,
        values: Array.from({ length: n }, (_, i) => l.values[zoomFrom + i] ?? null),
      })),
    [allLanes, zoomFrom, n],
  );
  const resolvedMarkers = useMemo(() => {
    const view =
      zoomTo === undefined
        ? markers
        : sliceForZoom(allCategories, [], markers, { from: zoomFrom, to: zoomTo }).markers;
    return resolveMarkers(
      view.map((m) => ({ ...m, labelPlacement: 'top' as const })),
      categories,
    );
  }, [markers, allCategories, categories, zoomFrom, zoomTo]);
  // Per lane, on the full categories (an out-of-zoom one is not "unknown"), shifted into the view.
  const laneAnnotations = useMemo(
    () =>
      allLanes.map((l) =>
        resolveAnnotations(l.type === 'dots' ? [] : (l.annotations ?? []), allCategories),
      ),
    [allLanes, allCategories],
  );
  const viewAnnotations = laneAnnotations.flatMap((r) =>
    r.annotations.flatMap((a) =>
      a.index >= zoomFrom && a.index - zoomFrom < categories.length
        ? [{ ...a, index: a.index - zoomFrom }]
        : [],
    ),
  );
  const references = lanes.flatMap((l) =>
    l.type === 'dots'
      ? []
      : (l.referenceLines ?? []).flatMap((r, i) =>
          Number.isFinite(r.value)
            ? [
                {
                  key: `${l.key}:${r.key ?? i}`,
                  label: `${l.label}: ${r.label}`,
                  text: l.formatValue(r.value),
                },
              ]
            : [],
        ),
  );
  useDevWarnings(
    loaded ? resolvedMarkers.dropped.join(', ') : '',
    loaded ? laneAnnotations.flatMap((r) => r.dropped).join(', ') : '',
    lanes
      .flatMap((l) =>
        (l.referenceLines ?? []).filter((r) => !Number.isFinite(r.value)).map((r) => r.label),
      )
      .join(', '),
  );

  const empty =
    zoomIdx === null &&
    (categories.length === 0 || lanes.every((l) => l.values.every((v) => v == null || v === 0)));

  const hintId = useId();
  const statusId = useId();
  const footnoteId = useId();
  const hasFootnote = footnote != null && footnote !== false && footnote !== '';
  const footnoteEl = hasFootnote && (
    <div id={footnoteId} className={chartStyles.footnote}>
      {footnote}
    </div>
  );

  const [setPlotEl, size, plotEl] = useSize<HTMLDivElement>();
  const [setRootEl, , rootEl] = useSize<HTMLElement>();
  const figureRef = useMemo(
    () => mergeRefs(ref, (el: HTMLElement | null) => setRootEl(el)),
    [ref, setRootEl],
  );
  const tokens = useMemo(
    () => ({
      dotsHeight: readPx(plotEl, '--lane-chart-dots-height', DOTS_HEIGHT),
      gap: readPx(plotEl, '--lane-chart-gap', LANE_GAP),
      labelHeight: readPx(plotEl, '--lane-chart-label-height', LABEL_HEIGHT),
      dotRadius: readPx(plotEl, '--lane-chart-dot-radius', DOT_RADIUS),
    }),
    [plotEl],
  );
  const gutterRows = markerGutterRows(resolvedMarkers.markers);
  const gutterGap = markerGutterGap(resolvedMarkers.markers);
  const layout = useMemo(
    () =>
      !empty && size.width > 0 && size.height > 0
        ? computeLaneLayout({
            lanes,
            categories,
            width: size.width,
            height: size.height,
            viewport: vp,
            // Chart's gutter sits inside the plot's PAD_TOP; lanes start below it, so it is added here.
            topGutter: gutterRows ? PAD_TOP + gutterRows * MARKER_LABEL_BASELINE + gutterGap : 0,
            dotsLaneHeight: tokens.labelHeight + tokens.dotsHeight,
            laneGap: tokens.gap,
            laneLabelHeight: tokens.labelHeight,
          })
        : null,
    [empty, size.width, size.height, lanes, categories, vp, gutterRows, gutterGap, tokens],
  );

  const ix = useChartInteraction({
    domain,
    // Shared x geometry only: no `valueAt`, so `onPlotDoubleClick` reports `value: null`.
    layout: layout && { plot: layout.plot, categoryX: layout.categoryX, step: layout.step },
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
  const { selectable, current, activeSource, selectedIdx, hasSelection, draft, point } = ix;
  const { statusText, zoomText, selectionNote, zoomNote, zoomed } = ix;

  const sync = useChartSync(syncEnabled);
  const badValues = categoryValues !== undefined && categoryValues.length !== allCategories.length;
  const unordered = useMemo(
    () => !!categoryValues?.some((v, i) => i > 0 && Number(v) <= Number(categoryValues[i - 1])),
    [categoryValues],
  );
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (badValues)
      console.warn(
        '[LaneChart] Ignored categoryValues: it must have one value per category. Syncing by category label instead.',
      );
    if (unordered)
      console.warn(
        '[LaneChart] categoryValues must be strictly ascending; synced matching will be wrong.',
      );
  }, [badValues, unordered]);
  // Publish this chart's inspected moment after commit, whenever it changes (as Chart): keyed by content.
  const own =
    current === null ? null : categoryPoint(zoomFrom + current, allCategories, categoryValues);
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
  // Another chart's moment, echoed here (visual only) while this chart inspects nothing itself; nothing when it is
  // off the zoom window or the viewport (the chart does not pan).
  const matched =
    sync.echo && layout && current === null
      ? matchCategory(sync.echo, allCategories, categoryValues)
      : null;
  const echoAt = matched === null ? -1 : matched - zoomFrom;
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

  const valueText = (l: Lane, i: number) => {
    const v = l.values[i];
    return v == null ? t('chart.noData') : l.formatValue(v);
  };
  const rows =
    shown === null
      ? []
      : lanes.map((l, i) => ({
          key: l.key,
          label: l.label,
          slot: laneSlot(l, i),
          comparison: false,
          value: valueText(l, shown),
        }));
  const notes =
    shown === null
      ? []
      : [
          ...markerLabelsAt(resolvedMarkers.markers, shown),
          ...annotationLabelsAt(viewAnnotations, shown),
          ...references.map((r) => `${r.label}: ${r.text}`),
        ];
  const detailLines = shown === null ? [] : (details?.(zoomFrom + shown) ?? []);
  const liveText =
    selectionNote ||
    zoomNote ||
    (activeSource === 'keyboard' && current !== null
      ? `${categories[current]}: ${rows.map((r) => `${r.label} ${r.value}`).join(', ')}${
          notes.length ? `. ${notes.join(', ')}` : ''
        }${detailLines.length ? `. ${detailLines.join(', ')}` : ''}`
      : '');

  const zoomButtons = (hasSelection || zoomed) && (
    <Cluster justify="end" gap="xs">
      {zoomed && (
        <Button size="xs" variant="ghost" onClick={ix.resetZoom}>
          {t('chart.resetZoom')}
        </Button>
      )}
      {hasSelection && (
        <Button size="xs" variant="ghost" onClick={ix.zoomToSelection}>
          {t('chart.zoomToSelection')}
        </Button>
      )}
    </Cluster>
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
      data-header={zoomButtons ? '' : undefined}
      data-footnote={hasFootnote || undefined}
      className={clsx(styles.root, className)}
    >
      {zoomButtons}
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
        className={chartStyles.plot}
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
          <LaneChartPlot
            layout={layout}
            lanes={lanes}
            size={size}
            markers={resolvedMarkers.markers}
            gutterRows={gutterRows}
            gutterGap={gutterGap}
            current={shown}
            echo={echo !== null}
            shownRange={draft ?? selectedIdx}
            clipped={vp !== null}
            tokens={tokens}
          />
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
        columns={lanes.map((l) => ({
          key: l.key,
          header: l.label,
          values: l.values,
          format: l.formatValue,
        }))}
        formatValue={String}
        notesHeader={t('chart.notes')}
        markers={resolvedMarkers.markers}
        annotations={viewAnnotations}
        detailsHeader={details ? t('chart.details') : undefined}
        detailsAt={(i) => details?.(zoomFrom + i) ?? []}
        references={references}
      />
    </figure>
  );
});
