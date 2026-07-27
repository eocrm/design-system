import {
  forwardRef,
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
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Table } from '../Table';
import type { TableDensity } from '../Table';
import { Checkbox } from '../Checkbox';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../EmptyState';
import { HeaderCell } from './HeaderCell';
import { BodyRow } from './BodyRow';
import { reorderRespectingPins } from './reorderColumns';
import { useColumnDragShift } from './useColumnDragShift';
import { useFloatingSurface } from '../_internal/overlay';
import { AUTO_CELL_WIDTH } from './pinStyle';
import type { DataTableInstance } from './types';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './DataTable.module.scss';

export interface DataTableProps<T> {
  instance: DataTableInstance<T>;
  density?: TableDensity;
  striped?: boolean;
  /** Hover highlight on body rows. Defaults TRUE (DataTable rows are usually interactive). */
  hover?: boolean;
  bordered?: boolean;
  loading?: boolean;
  /** Number of skeleton rows when `loading`. Defaults 10. */
  loadingRowCount?: number;
  /** Element shown when `data` is empty and not loading. Defaults to a stock <EmptyState>. */
  emptyState?: ReactNode;
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
  onDragActiveChange,
}: {
  rootRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  orderedIds: string[];
  widths: Record<string, number>;
  onDragActiveChange: (active: boolean) => void;
}) {
  useColumnDragShift({ rootRef, enabled, orderedIds, widths, onDragActiveChange });
  return null;
}

/** Sorting strategy that moves nothing — see the SortableContext comment. */
const noopSortingStrategy = () => null;

function DataTableInner<T>(
  {
    instance,
    density = 'comfortable',
    striped,
    hover = true,
    bordered,
    loading = false,
    loadingRowCount = 10,
    emptyState,
    caption,
    dragWholeColumn = true,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

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
  const dataIsEmpty = !loading && instance.data.length === 0 && instance.pinnedRows.length === 0;

  const [dragActive, setDragActive] = useState(false);

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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
        {/* {...rest} last so consumer overrides win (Pattern A). */}
        <Table
          ref={setTableRef}
          stickyHeader
          hover={hover}
          density={density}
          striped={striped}
          bordered={bordered}
          aria-rowcount={instance.rowCount}
          className={clsx(styles.root, className)}
          {...rest}
        >
          {caption && <Table.Caption>{caption}</Table.Caption>}

          <colgroup>
            {instance.enableRowSelection && <col style={{ width: AUTO_CELL_WIDTH }} />}
            {instance.hasExpansion && <col style={{ width: AUTO_CELL_WIDTH }} />}
            {renderColumns.map((col) => (
              <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
            ))}
          </colgroup>

          <Table.Header>
            <Table.Row>
              {instance.enableRowSelection && (
                <Table.HeaderCell
                  align="center"
                  scope="col"
                  className={clsx(styles.autoCell, styles.autoCellStickyHeader)}
                  style={{ position: 'sticky', left: 0 }}
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
                />
              ))}
            </Table.Row>
          </Table.Header>

          {instance.pinnedRows.length > 0 && (
            <Table.Body className={styles.pinnedRowsTbody} aria-label={t('dataTable.pinnedRows')}>
              {instance.pinnedRows.map((row) => (
                <BodyRow
                  key={instance.getRowId(row)}
                  row={row}
                  instance={instance}
                  isPinnedRow
                  dragWholeColumn={dragWholeColumn}
                  dragActive={dragActive}
                />
              ))}
            </Table.Body>
          )}

          <Table.Body>
            {loading ? (
              <SkeletonRows count={loadingRowCount} totalColCount={totalColCount} />
            ) : dataIsEmpty ? (
              <EmptyRow totalColCount={totalColCount} content={emptyState} />
            ) : (
              instance.data.map((row) => (
                <BodyRow
                  key={instance.getRowId(row)}
                  row={row}
                  instance={instance}
                  dragWholeColumn={dragWholeColumn}
                  dragActive={dragActive}
                />
              ))
            )}
          </Table.Body>
        </Table>
      </SortableContext>
    </DndContext>
  );
}

function SkeletonRows({ count, totalColCount }: { count: number; totalColCount: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Table.Row key={`sk-${i}`}>
          {Array.from({ length: totalColCount }, (_, j) => (
            <Table.Cell key={j} className={styles.skeletonCell}>
              <Skeleton variant="text" width="80%" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

function EmptyRow({ totalColCount, content }: { totalColCount: number; content?: ReactNode }) {
  const t = useTranslation();
  return (
    <Table.Row>
      <Table.Cell colSpan={totalColCount} className={styles.emptyCell}>
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
