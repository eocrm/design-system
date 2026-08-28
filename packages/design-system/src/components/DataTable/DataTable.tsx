import {
  forwardRef,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Table } from '../Table';
import type { TableDensity } from '../Table';
import { Checkbox } from '../Checkbox';
import { Skeleton, useSkeletonVisibility } from '../Skeleton';
import { EmptyState } from '../EmptyState';
import { HeaderCell } from './HeaderCell';
import { BodyRow } from './BodyRow';
import { reorderRespectingPins } from './reorderColumns';
import { useColumnDragShift } from './useColumnDragShift';
import { clampX, type DragRangeX } from './columnShift';
import { useFloatingSurface } from '../_internal/overlay';
import {
  dragLabelOf,
  useDragAccessibility,
  type DescribeDragTarget,
} from '../_internal/dragAnnouncements';
import { AUTO_CELL_WIDTH } from './pinStyle';
import type { DataTableInstance } from './types';
import type { CollapseBreakpoint } from '../_internal/collapse';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './DataTable.module.scss';

const collapseClass: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};

export interface DataTableProps<T> {
  instance: DataTableInstance<T>;
  density?: TableDensity;
  striped?: boolean;
  /** Hover highlight on body rows. Defaults TRUE (DataTable rows are usually interactive). */
  hover?: boolean;
  bordered?: boolean;
  /**
   * Marks the table busy. Empty tables show skeleton rows; populated tables
   * keep their rows mounted during a refetch so focus and local row state are
   * preserved. Defaults to `false`.
   *
   * Announced from a polite live region the table owns, gated on the SKELETON
   * rather than on this prop: a load shorter than `skeletonDelay` shows nothing
   * and so says nothing, and a refetch over rows already on screen is silent
   * because nothing visibly changes. The resolution is announced too — "Rows
   * loaded" or "No rows loaded". `aria-busy` is also set, but reaches no screen
   * reader on its own.
   */
  loading?: boolean;
  /** Number of skeleton rows when `loading`. Defaults 10. */
  loadingRowCount?: number;
  /**
   * Milliseconds to wait before showing skeleton rows for an empty initial
   * load. Defaults to `0`; fast loads that finish inside the delay never show
   * a skeleton.
   */
  skeletonDelay?: number;
  /**
   * Minimum milliseconds skeleton rows remain visible after appearing.
   * Defaults to `0`. Arriving rows and the empty state remain hidden until the
   * visual tail finishes.
   */
  skeletonMinDuration?: number;
  /** Element shown when `data` is empty and not loading. Defaults to a stock <EmptyState>. */
  emptyState?: ReactNode;
  /**
   * Stacks responsive data cells below this container-query breakpoint: `sm`
   * (480px), `md` (640px), or `lg` (768px). Selection, expansion, sorting,
   * row actions, and column visibility remain usable. Column sizing, pinning,
   * and ordering state is retained, but resize/reorder controls and sticky pin
   * presentation are unavailable while stacked and return after widening.
   *
   * This adds a wrapper with `container-type: inline-size`, so the breakpoint
   * measures the table's available container width, not the viewport. Avoid an
   * intrinsic-width parent such as `width: max-content`: inline-size containment
   * can make the wrapper contribute zero intrinsic width there.
   */
  collapseBelow?: CollapseBreakpoint;
  /** Required for a11y when no caption is provided. */
  'aria-label'?: string;
  caption?: ReactNode;
  /**
   * Drag the whole column while reordering, not just its header cell.
   *
   * Default `true` — the dragged column's body cells travel with its header,
   * and every column the drag displaces shifts its body cells too, so the
   * header row and the body never disagree mid-drag. Costs one CSS-variable
   * write per shifted column per frame; the cells move on the compositor, so
   * the table body is not re-rendered during pointer movement. It does cost
   * two full body reconciliations per drag — one at drag start, one at drag
   * end — because the drag-active flag is component state and body rows are
   * not memoized; that is the number to weigh for a very large table.
   *
   * Set `false` for the cheaper preview: only the dragged header cell follows
   * the pointer and the body stays put until drop. Worth it for very large
   * tables on low-end hardware, or to restore the previous behavior.
   *
   * Pinned columns never move under either setting — they are excluded from
   * reordering entirely.
   *
   * The two settings also differ on **what a release means when no unpinned
   * slot is under the column** — over a pinned column, or off the table
   * entirely. Default: the drop commits the slot the preview is showing. The
   * opt-out: the drop is discarded, because dnd-kit's own preview retracts (the
   * header snaps back home) in that situation, and a commit would contradict
   * it. See the component's `@remarks`.
   */
  dragWholeColumn?: boolean;
  className?: string;
}

/**
 * Tabular data component built on the `<Table>` primitive. Owns the column-axis
 * state machine (order / sizing / visibility / pinning) and row-axis state
 * (selection, expansion). Sort/search/pagination are server-driven — DataTable
 * fires `onSortChange` and exposes selection state for the consumer to act on.
 *
 * Accepts a `DataTableInstance<T>` from `useDataTable` (the only state-owning
 * surface). Pass companion components like `<ColumnVisibilityTrigger>` the same
 * `instance`.
 *
 * **Layout model.** The inner `<table>` uses `table-layout: fixed; width:
 * max-content; min-width: 100%` — column widths come authoritatively from the
 * `<colgroup>` (driven by `ColumnDef.size` + `columnSizing` state), and the
 * table grows to its column-sum width when that exceeds the parent. The Table
 * primitive's `.scrollWrap` then scrolls horizontally. This is required for
 * sticky pinning offsets to land at the right pixel; consumers don't choose.
 *
 * **Cell content.** Every cell inside DataTable gets `overflow: hidden;
 * text-overflow: ellipsis; white-space: nowrap` by default. Long content
 * truncates with an ellipsis at the column boundary instead of expanding the
 * column. If you need multi-line cells, render `<Table>` directly — DataTable
 * is opinionated about row height to keep pin offsets consistent across rows.
 *
 * **Responsive stack.** Set `collapseBelow` to stack data cells when this
 * table's containing block is at or below `sm` (480px), `md` (640px), or `lg`
 * (768px). This is a container query, not a viewport breakpoint, so adjacent
 * tables can respond independently. The wrapper uses inline-size containment;
 * do not place it in an intrinsic-width parent (`width: max-content`, for
 * example), where containment can collapse its intrinsic contribution to zero.
 * Selection, expansion, sorting, row actions, and column visibility stay
 * available in the stacked presentation. Column sizing, pinning, and ordering
 * state is retained, but resize/reorder controls and sticky pin presentation
 * are unavailable until the container widens again.
 *
 * @example
 * function Example() {
 *   const instance = useDataTable<Row>({
 *     data, columns, getRowId,
 *     enableRowSelection: true,
 *     onSortChange: setSort,
 *     sort,
 *   });
 *   return (
 *     <>
 *       <ColumnVisibilityTrigger instance={instance} />
 *       <DataTable instance={instance} aria-label="Deals" />
 *     </>
 *   );
 * }
 *
 * @example
 * // Column pinning + pinned rows
 * const instance = useDataTable({
 *   data, pinnedRows: starredDeals, columns, getRowId,
 *   defaultColumnPinning: { left: ['name'], right: ['actions'] },
 * });
 * <DataTable instance={instance} aria-label="Deals" />;
 *
 * @example
 * // Stack labeled data cells below 640px of available container width.
 * <DataTable instance={instance} aria-label="Deals" collapseBelow="md" />;
 *
 * @example
 * // Expandable rows — chevron auto-column at left, detail row below on expand:
 * const instance = useDataTable({
 *   data, columns, getRowId,
 *   renderExpandedRow: (row) => (
 *     <Stack gap="sm">
 *       <p>Full description: {row.description}</p>
 *       <Button onClick={() => archive(row.id)}>Archive</Button>
 *     </Stack>
 *   ),
 * });
 * <DataTable instance={instance} aria-label="Deals" />;
 *
 * @remarks Column reorder — a drag commits, it does not cancel
 * A column drag commits wherever the preview parked it, however far the pointer
 * roams: over a pinned column, past the table's edge, anywhere. There is no
 * "outside" to release into — the column is clamped to the unpinned band, so
 * the preview is always showing a real slot and the drop honors it (#383).
 * **Escape is the only cancel.** This deliberately differs from `<Kanban>`,
 * where releasing outside the columns cancels (#387): there the pointer can
 * genuinely aim somewhere else, here it cannot.
 *
 * `dragWholeColumn={false}` is the exception. Its preview is dnd-kit's own and
 * RETRACTS — the dragged header snaps back to its origin and the gap closes —
 * whenever no unpinned slot is under the column, so a release there is
 * discarded instead. Both paths follow the same rule: commit what the preview
 * last showed.
 *
 * @remarks When NOT to use
 * - For a static read-only table without column features — use `<Table>` directly.
 * - For huge datasets (10k+ rows on screen at once) — Phase 1 doesn't virtualize;
 *   this'll get slow. Future phase will add a virtualization escape hatch.
 * - For Excel-like cell editing or cell selection — out of scope; consumer composes.
 *
 * @remarks Anti-patterns
 * - ❌ Pre-sorting / pre-filtering `data` client-side then ALSO passing `sort`.
 *   DataTable assumes `data` is the server's pre-paginated, pre-sorted slice.
 *   Mixing creates ghost rows.
 * - ❌ Mutating `columns` identity across renders. The hook captures
 *   `defaultColumnOrder` from `columns` once; later identity changes won't
 *   trigger a re-derive. Pass a stable reference (e.g. defined outside render
 *   or memoized).
 */

/**
 * #282: registers the active column-reorder drag as a floating surface so a
 * host Modal/Drawer yields the Escape that cancels it. A leaf inside DndContext
 * (reads `active` via `useDndContext`) so the drag-active toggle re-renders only
 * this null node — never the table body.
 */
function DragFloatingProbe() {
  const { active } = useDndContext();
  useFloatingSurface(active != null);
  return null;
}

/**
 * Publishes per-column drag offsets as CSS custom properties on the table
 * element. A leaf that renders `null` for the same reason `DragFloatingProbe`
 * is one: `useDndMonitor` fires on every pointer move, and keeping the
 * subscription here means those events never re-render the table body.
 */
function ColumnShiftDriver({
  rootRef,
  enabled,
  orderedIds,
  widths,
  dragRangeRef,
  lastSlotIdRef,
  onDragActiveChange,
}: {
  rootRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  orderedIds: string[];
  widths: Record<string, number>;
  dragRangeRef: RefObject<DragRangeX | null>;
  lastSlotIdRef: RefObject<string | null>;
  onDragActiveChange: (active: boolean) => void;
}) {
  useColumnDragShift({
    rootRef,
    enabled,
    orderedIds,
    widths,
    dragRangeRef,
    lastSlotIdRef,
    onDragActiveChange,
  });
  return null;
}

/** Sorting strategy that moves nothing — see the SortableContext comment. */
const noopSortingStrategy = () => null;

function ResponsiveScrollWrap({
  collapseBelow,
  children,
}: {
  collapseBelow?: CollapseBreakpoint;
  children: ReactNode;
}) {
  if (!collapseBelow) return children;
  return (
    <div className={clsx(styles.responsiveScrollWrap, collapseClass[collapseBelow])}>
      {children}
    </div>
  );
}

function DataTableInner<T>(
  {
    instance,
    density = 'comfortable',
    striped,
    hover = true,
    bordered,
    loading = false,
    loadingRowCount = 10,
    skeletonDelay = 0,
    skeletonMinDuration = 0,
    emptyState,
    caption,
    dragWholeColumn = true,
    collapseBelow,
    className,
    ...rest
  }: DataTableProps<T>,
  ref: Ref<HTMLTableElement>,
) {
  const t = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const visibleIds = useMemo(
    () => instance.visibleColumns.map((c) => c.id),
    [instance.visibleColumns],
  );

  // SortableContext items: only columns that are actually reorderable (unpinned
  // AND enableReorder !== false). Pinned columns are excluded so dnd-kit doesn't
  // animate them out of position when a draggable column crosses over them —
  // their per-column `useSortable({ disabled })` blocks drag activation, but
  // their presence in the items list still makes horizontalListSortingStrategy
  // shift them during another column's drag.
  // Note this deliberately does NOT mirror HeaderCell's "hide the grip when
  // there is only one unpinned column" rule. A lone unpinned column stays in
  // this list while its own `useSortable({ disabled })` blocks activation —
  // a single-item sorting context is a no-op, and keeping the lists derived
  // from one filter each is clearer than keeping two conditions in sync.
  const sortableIds = useMemo(
    () => instance.unpinnedColumns.filter((c) => c.enableReorder !== false).map((c) => c.id),
    [instance.unpinnedColumns],
  );

  // Shift-driver geometry: EVERY unpinned column, reorderable or not. Do not
  // "deduplicate" this with `sortableIds` — the enableReorder filter above is
  // correct for SortableContext and wrong here. A non-reorderable unpinned
  // column still occupies space and is still displaced when a reorderable
  // column is dragged past it, and the drop path (reorderRespectingPins) moves
  // it. Feeding sortableIds here made the preview skip it: the skipped column
  // and its neighbour rendered on top of each other full-height, then the drop
  // landed somewhere the preview never showed.
  const shiftOrderedIds = useMemo(
    () => instance.unpinnedColumns.map((c) => c.id),
    [instance.unpinnedColumns],
  );

  // Travel available to the column being dragged, measured from real header
  // rects when the drag starts (see `measureDragRangeX`). One measurement, two
  // readers: `useColumnDragShift` clamps the delta it publishes, and the
  // modifier below clamps `modifiedTranslate`. Null when no drag is active.
  const dragRangeRef = useRef<DragRangeX | null>(null);

  // Keep the dragged column inside the unpinned band. Without a clamp the
  // pointer delta is applied raw, so a column can be dragged past the first or
  // last slot and off the table entirely — and since `dragWholeColumn` defaults
  // to true, that drags a full column of body cells over unrelated page content
  // (#381).
  //
  // This modifier covers two things the delta clamp in `useColumnDragShift`
  // cannot:
  //  - the COLLISION RECT. dnd-kit derives it as
  //    `getAdjustedRect(draggingNodeRect, modifiedTranslate)`, so clamping here
  //    keeps `over` resolving to the last reachable column instead of going
  //    null once the pointer leaves the table.
  //  - the HEADER-ONLY path (`dragWholeColumn={false}`), where the header rides
  //    `useSortable`'s own transform — which is `modifiedTranslate` — and never
  //    touches this component's shift variables.
  //
  // Known residual, deliberately not papered over: on the header-only path this
  // modifier can still be exceeded by dnd-kit's horizontal auto-scroll, because
  // `scrollAdjustedTranslate = add(modifiedTranslate, scrollAdjustment)` adds
  // the scroll adjustment AFTER modifiers run. The default whole-column path is
  // unaffected — it clamps `delta`, which is already post-adjustment. Fixing
  // the opt-out path too would mean overriding dnd-kit's auto-scroll.
  const clampToUnpinnedBand = useCallback<Modifier>(({ transform, active }) => {
    const range = dragRangeRef.current;
    if (!active || !range) return transform;
    return { ...transform, x: clampX(transform.x, range) };
  }, []);
  const modifiers = useMemo(() => [clampToUnpinnedBand], [clampToUnpinnedBand]);

  // #383: the last slot in the unpinned band that this drag resolved. Written
  // by the shift driver — nulled at drag start, set on every `onDragOver` whose
  // target is a band member — and read by BOTH the whole-column preview and the
  // drop below. One value feeding both is what makes them agree by construction
  // on that path, instead of by coincidence.
  //
  // WHOLE-COLUMN MODE ONLY, and that restriction is load-bearing rather than
  // cautious. On the header-only path the preview is dnd-kit's own, driven by
  // `overIndex` against `SortableContext items={sortableIds}` — a list that
  // excludes pinned columns. When the pinned column wins the collision the
  // index is -1, so every transform including the dragged header's resolves to
  // null: the header snaps back home and the gap closes. The preview there
  // RETRACTS its promise, so committing would contradict what the user is
  // looking at just as badly as discarding does here. That path keeps its
  // discard, which at least agrees with its own preview.
  //
  // dnd-kit hands us a target the drop cannot use in two situations, and a
  // pinned column produces both:
  //
  //  - `over` IS the pinned column. A boolean `disabled` on `useSortable`
  //    normalizes to `{ draggable: true, droppable: false }` — it stands the
  //    DRAGGABLE down and leaves the droppable registered — so a pinned column
  //    is still a collision target. It is `position: sticky`, so once the table
  //    is scrolled its rect sits ON TOP of the band's last columns and it wins
  //    the intersection outright. `reorderRespectingPins` then rejects the move
  //    as cross-boundary and the drop evaporates.
  //  - `over` is null, which is where dnd-kit's horizontal auto-scroll lands:
  //    the scroll adjustment is applied to the translate AFTER modifiers run,
  //    so the collision rect desyncs from the droppable rects and stops
  //    intersecting anything at all.
  //
  // Either way the column is visibly parked at a valid slot when the user lets
  // go — #382's clamp holds it inside the band — so discarding the drop breaks
  // the promise the preview just made. Falling back to the last band slot keeps
  // it. `reorderRespectingPins` stays as the backstop; this ref can only ever
  // hold a band member, so a cross-boundary move cannot reach it.
  //
  // FAILS CLOSED, deliberately. `over` resolves to the dragged column itself at
  // pickup, and the dragged column is a band member, so the ref seeds with
  // `activeId`. A drag that never resolves any OTHER band member — a two-column
  // band whose only other slot is covered by a wide sticky pinned column, say —
  // therefore falls back to `activeId`, which the guard below reads as "no
  // move" and the original discard survives. Wrong in the harmless direction:
  // nothing moves that the user did not aim at.
  const lastSlotIdRef = useRef<string | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);
    // An out-of-band target is not a slot. When `over` is one, the last slot
    // the band DID resolve is both the honest answer and the one on screen —
    // but only where the whole-column preview is what painted it (see above).
    //
    // The raw branch is not dead weight even though `onDragOver` has already
    // recorded any in-band `over` into the ref: it is the ONLY source on the
    // header-only path, where the fallback is null by design.
    const overIdRaw = over ? String(over.id) : null;
    const fallbackId = dragWholeColumn ? lastSlotIdRef.current : null;
    const overId =
      overIdRaw != null && shiftOrderedIds.includes(overIdRaw) ? overIdRaw : fallbackId;
    if (overId == null || activeId === overId) return;

    instance.setColumnOrder((prev) => {
      const next = reorderRespectingPins({
        prev,
        activeId,
        overId,
        visibleIds,
        pinning: instance.columnPinning,
      });
      return next ?? prev; // null = rejected, keep prev unchanged
    });
  };

  // Pin-ordered render list: [left-pinned, unpinned, right-pinned].
  // Drives <colgroup>, header row, and body rows so all three stay aligned.
  const renderColumns = useMemo(
    () => [
      ...instance.leftPinnedColumns,
      ...instance.unpinnedColumns,
      ...instance.rightPinnedColumns,
    ],
    [instance.leftPinnedColumns, instance.unpinnedColumns, instance.rightPinnedColumns],
  );

  const totalColCount =
    instance.visibleColumns.length +
    (instance.enableRowSelection ? 1 : 0) +
    (instance.hasExpansion ? 1 : 0);
  const hasRenderedRows = instance.data.length > 0 || instance.pinnedRows.length > 0;
  const showSkeletonRows = useSkeletonVisibility(loading && !hasRenderedRows, {
    delay: skeletonDelay,
    minDuration: skeletonMinDuration,
  });
  const dataIsEmpty = !loading && !showSkeletonRows && !hasRenderedRows;

  // Announce the SKELETON, not the raw `loading` prop. Tying it to `loading`
  // meant a table with `skeletonDelay={300}` still announced a 200ms load it
  // had deliberately decided to show nothing for, and a background refetch
  // over rendered rows — which changes nothing on screen — interrupted the
  // user on every poll. And announce the resolution: going from "Loading
  // rows…" to populated in silence is the same half-finished shape this
  // region exists to fix.
  //
  // Resolution announces the OUTCOME, not just "finished": landing on an empty
  // table said "Rows loaded" while the screen read "No data". And it clears
  // once announced — a live region only fires on change, so leaving the text
  // in place bought nothing and left a stale node for a browse-mode reader to
  // trip over under every loaded table.
  const [loadPhase, setLoadPhase] = useState<'idle' | 'loading' | 'loaded' | 'empty'>('idle');
  useEffect(() => {
    setLoadPhase((prev) => {
      if (showSkeletonRows) return 'loading';
      if (prev !== 'loading') return prev;
      return hasRenderedRows ? 'loaded' : 'empty';
    });
  }, [showSkeletonRows, hasRenderedRows]);
  useEffect(() => {
    if (loadPhase !== 'loaded' && loadPhase !== 'empty') return;
    const id = setTimeout(() => setLoadPhase('idle'), CLEAR_STATUS_MS);
    return () => clearTimeout(id);
  }, [loadPhase]);
  const responsiveEnabled = collapseBelow != null;
  const hasResponsiveHeaderItems =
    instance.enableRowSelection ||
    renderColumns.some((column) => column.sortable === true || typeof column.header !== 'string');

  const [dragActive, setDragActive] = useState(false);

  // Localized column-reorder announcements (Hard rule 9). `HeaderCell` publishes
  // the rendered header text, so a drag says "Amount, position 3 of 7" instead
  // of "col-amount was moved over droppable area col-name".
  //
  // This resolves the slot exactly the way `handleDragEnd` does, in the SAME
  // index space, and both halves of that are load-bearing:
  //
  //  - `shiftOrderedIds`, not `sortableIds`. The two differ by the
  //    `enableReorder: false` columns: excluded from `SortableContext` (nothing
  //    to activate) but still droppable, still displaced, and still moved by
  //    `reorderRespectingPins` — see the comment on `shiftOrderedIds`. Deciding
  //    "in band" from the SortableContext list therefore calls a legal target
  //    unusable, and announces "Nothing moved." over a drop that reordered. It
  //    is also the set the position number belongs in: a listener is being told
  //    where the column landed among the visible unpinned columns.
  //  - the same `lastSlotIdRef` fallback (#383). In whole-column mode `over` can
  //    name something the drop cannot use — a sticky pinned column covering the
  //    band's last slot, or nothing at all after an auto-scroll desync, both
  //    observed — and `handleDragEnd` commits the last band slot the drag
  //    resolved rather than discarding. Announcing from raw `over` would call
  //    that reorder "nothing", which is the defect #390 was filed about with the
  //    sign flipped.
  //
  // The label is only ever read off `active`; a drop target's is unused.
  const describeColumn: DescribeDragTarget = (entry) => {
    const id = entry ? String(entry.id) : null;
    const slotId =
      id != null && shiftOrderedIds.includes(id)
        ? id
        : dragWholeColumn
          ? lastSlotIdRef.current
          : null;
    const slot = slotId == null ? -1 : shiftOrderedIds.indexOf(slotId);
    if (slot < 0) return null;
    return {
      label: dragLabelOf(entry?.data.current),
      index: slot + 1,
      total: shiftOrderedIds.length,
    };
  };
  const dragAccessibility = useDragAccessibility(describeColumn);

  // The shift driver writes custom properties onto the <table> element, so we
  // need our own handle on it while still honouring the consumer's ref.
  const tableRef = useRef<HTMLTableElement | null>(null);
  const setTableRef = useCallback(
    (node: HTMLTableElement | null) => {
      tableRef.current = node;
      if (typeof ref === 'function') {
        // React 19 callback refs may return a cleanup function. Returning one
        // from here keeps that contract alive — swallowing it would make React
        // fall back to the legacy `ref(null)` call and leak whatever the
        // consumer set up. Callback refs that return nothing, and object refs,
        // behave exactly as before.
        const cleanup = ref(node);
        if (typeof cleanup === 'function')
          return () => {
            cleanup();
            tableRef.current = null;
          };
      } else if (ref) (ref as { current: HTMLTableElement | null }).current = node;
    },
    [ref],
  );

  const table = (
    <DndContext
      accessibility={dragAccessibility}
      sensors={sensors}
      modifiers={modifiers}
      onDragEnd={handleDragEnd}
    >
      {/* #282: register the column-reorder drag as a floating surface while
          active so a host Modal/Drawer yields the Escape that cancels it (the
          drag cancels; the host survives). A leaf probe (not root state) so the
          drag-active toggle re-renders only this null node, never the table body. */}
      <DragFloatingProbe />
      <ColumnShiftDriver
        rootRef={tableRef}
        enabled={dragWholeColumn}
        orderedIds={shiftOrderedIds}
        widths={instance.columnSizesPx}
        dragRangeRef={dragRangeRef}
        lastSlotIdRef={lastSlotIdRef}
        onDragActiveChange={setDragActive}
      />
      <SortableContext
        items={sortableIds}
        // In whole-column mode the shift variables are the single source of
        // truth for BOTH header and body. Standing dnd-kit's own transforms
        // down takes TWO mechanisms, because `useSortable` treats the dragged
        // item and its neighbours differently:
        //  - DISPLACED NEIGHBOURS go through the strategy, so a no-op strategy
        //    is what silences them. That is all this prop does.
        //  - The ACTIVE column never consults the strategy at all: with no
        //    <DragOverlay> rendered, useSortable short-circuits to its own
        //    `dragSourceDisplacement`. It is `useShiftVar` in HeaderCell —
        //    which discards `transform` outright — that keeps the dragged
        //    header glued to its body cells. Relaxing that guard would desync
        //    the dragged column no matter what this strategy says.
        strategy={dragWholeColumn ? noopSortingStrategy : horizontalListSortingStrategy}
      >
        {/* Consumer-native table attributes still override component defaults.
            `scroll` is the one invariant: it is not public on DataTableProps,
            and keeping it after the spread also rejects a runtime-only override
            that would break the instance-owned responsive wrapper. */}
        <ResponsiveScrollWrap collapseBelow={collapseBelow}>
          <Table
            ref={setTableRef}
            stickyHeader
            hover={hover}
            density={density}
            striped={striped}
            bordered={bordered}
            aria-busy={loading || undefined}
            aria-rowcount={instance.rowCount}
            className={clsx(styles.root, className)}
            {...rest}
            scroll={!responsiveEnabled}
          >
            {caption && <Table.Caption>{caption}</Table.Caption>}

            <colgroup>
              {instance.enableRowSelection && <col style={{ width: AUTO_CELL_WIDTH }} />}
              {instance.hasExpansion && <col style={{ width: AUTO_CELL_WIDTH }} />}
              {renderColumns.map((col) => (
                <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
              ))}
            </colgroup>

            <Table.Header
              data-responsive-has-items={responsiveEnabled ? hasResponsiveHeaderItems : undefined}
            >
              <Table.Row>
                {instance.enableRowSelection && (
                  <Table.HeaderCell
                    align="center"
                    scope="col"
                    className={clsx(styles.autoCell, styles.autoCellStickyHeader)}
                    style={{ position: 'sticky', left: 0 }}
                    data-responsive-control={responsiveEnabled || undefined}
                  >
                    <Checkbox
                      checked={instance.isAllOnPageSelected()}
                      indeterminate={instance.isSomeOnPageSelected()}
                      onChange={() => instance.toggleAllOnPage()}
                      aria-label={t('dataTable.selectAll')}
                    />
                  </Table.HeaderCell>
                )}
                {instance.hasExpansion && (
                  <Table.HeaderCell
                    align="center"
                    scope="col"
                    className={clsx(styles.autoCell, styles.autoCellStickyHeader)}
                    style={{
                      position: 'sticky',
                      left: instance.enableRowSelection ? AUTO_CELL_WIDTH : 0,
                    }}
                    // Empty header — the expand column has no per-column action.
                    aria-label={t('dataTable.rowExpansion')}
                  />
                )}
                {renderColumns.map((col) => (
                  <HeaderCell
                    key={col.id}
                    column={col}
                    instance={instance}
                    dragWholeColumn={dragWholeColumn}
                    dragActive={dragActive}
                    responsiveEnabled={responsiveEnabled}
                  />
                ))}
              </Table.Row>
            </Table.Header>

            {!showSkeletonRows && instance.pinnedRows.length > 0 && (
              <Table.Body className={styles.pinnedRowsTbody} aria-label={t('dataTable.pinnedRows')}>
                {instance.pinnedRows.map((row) => (
                  <BodyRow
                    key={instance.getRowId(row)}
                    row={row}
                    instance={instance}
                    isPinnedRow
                    dragWholeColumn={dragWholeColumn}
                    dragActive={dragActive}
                    responsiveEnabled={responsiveEnabled}
                  />
                ))}
              </Table.Body>
            )}

            <Table.Body>
              {showSkeletonRows ? (
                <SkeletonRows
                  count={loadingRowCount}
                  totalColCount={totalColCount}
                  responsiveEnabled={responsiveEnabled}
                />
              ) : dataIsEmpty ? (
                <EmptyRow
                  totalColCount={totalColCount}
                  content={emptyState}
                  responsiveEnabled={responsiveEnabled}
                />
              ) : (
                instance.data.map((row) => (
                  <BodyRow
                    key={instance.getRowId(row)}
                    row={row}
                    instance={instance}
                    dragWholeColumn={dragWholeColumn}
                    dragActive={dragActive}
                    responsiveEnabled={responsiveEnabled}
                  />
                ))
              )}
            </Table.Body>
          </Table>
        </ResponsiveScrollWrap>
        {/* Polite live region OUTSIDE the table — a <span> inside <table> is
            invalid HTML — and AFTER the scroll wrap, so it does not displace
            the wrapper as first child. Rendered unconditionally so only its
            text mutates. `aria-busy` on the table is inert to screen readers,
            so without this the table goes from silent to populated with
            nothing said. See CLAUDE.md Hard rule 10. */}
        <span role="status" aria-live="polite" className={styles.srStatus}>
          {loadPhase === 'loading'
            ? t('dataTable.loading')
            : loadPhase === 'loaded'
              ? t('dataTable.loaded')
              : loadPhase === 'empty'
                ? t('dataTable.loadedEmpty')
                : ''}
        </span>
      </SortableContext>
    </DndContext>
  );

  if (!collapseBelow) return table;

  return (
    <div className={styles.responsiveContainer} data-collapse-below={collapseBelow}>
      {table}
    </div>
  );
}

function SkeletonRows({
  count,
  totalColCount,
  responsiveEnabled,
}: {
  count: number;
  totalColCount: number;
  responsiveEnabled: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Table.Row key={`sk-${i}`}>
          {Array.from({ length: totalColCount }, (_, j) => (
            <Table.Cell
              key={j}
              className={clsx(styles.skeletonCell, responsiveEnabled && styles.responsiveFullWidth)}
            >
              <Skeleton variant="text" width="80%" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

/** Long enough for the announcement to be picked up, short enough not to linger. */
const CLEAR_STATUS_MS = 1000;

function EmptyRow({
  totalColCount,
  content,
  responsiveEnabled,
}: {
  totalColCount: number;
  content?: ReactNode;
  responsiveEnabled: boolean;
}) {
  const t = useTranslation();
  return (
    <Table.Row>
      <Table.Cell
        colSpan={totalColCount}
        className={clsx(styles.emptyCell, responsiveEnabled && styles.responsiveFullWidth)}
      >
        {content ?? <EmptyState title={t('dataTable.empty')} />}
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Generic forwardRef wrapper — TypeScript erases the `T` generic in a normal
 * forwardRef so we re-type via assertion. This is the standard pattern for
 * generic forwardRef components.
 */
export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: Ref<HTMLTableElement> },
) => ReturnType<typeof DataTableInner>;
