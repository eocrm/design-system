import { useCallback, useMemo } from 'react';
import { useControllableState } from './useControllableState';
import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  DataTableInstance,
  ExpandedRowsState,
  RowSelectionState,
  SortState,
  UseDataTableOptions,
} from './types';

const EMPTY_PINNING: ColumnPinningState = { left: [], right: [] };

/**
 * Headless state machine for `<DataTable>`. Implements the Radix-style
 * controlled/uncontrolled pattern for every state piece. Returns an
 * `instance` object passed into `<DataTable instance={...} />` and any
 * companion components (e.g. `<DataTable.ColumnVisibilityTrigger>`).
 *
 * Pure logic — no DOM, no refs to elements, no side effects beyond firing
 * the consumer's onChange callbacks.
 *
 * @example
 * const instance = useDataTable<Deal>({
 *   data,
 *   columns,
 *   getRowId: (r) => r.id,
 *   sort,
 *   onSortChange: setSort,
 * });
 * <DataTable instance={instance} aria-label="Deals" />
 *
 * @example
 * // With row selection and column visibility:
 * const instance = useDataTable<Deal>({
 *   data,
 *   columns,
 *   getRowId: (r) => r.id,
 *   enableRowSelection: true,
 *   onRowSelectionChange: setRowSelection,
 * });
 * <Cluster justify="end">
 *   <ColumnVisibilityTrigger instance={instance} />
 * </Cluster>
 * <DataTable instance={instance} aria-label="Deals" />
 *
 * @example
 * // Fully controlled column order + sizing (e.g. persisted to localStorage):
 * const instance = useDataTable<Deal>({
 *   data,
 *   columns,
 *   getRowId: (r) => r.id,
 *   columnOrder: savedOrder,
 *   onColumnOrderChange: setSavedOrder,
 *   columnSizing: savedSizing,
 *   onColumnSizingChange: setSavedSizing,
 * });
 *
 * @remarks When NOT to use
 * - For a read-only static table — use `<Table>` directly. `useDataTable`
 *   adds overhead you don't need when there's no column or row interactivity.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `value` and `defaultValue` for the same state piece — `value`
 *   wins and `defaultValue` is silently ignored. Pick one.
 * - ❌ Mutating `columns` identity across renders. The hook captures
 *   `defaultColumnOrder` from `columns` once at mount; later identity changes
 *   don't trigger a re-derive. Pass a stable reference (`useMemo` or module-level).
 * - ❌ Client-sorting `data` AND passing controlled `sort`. DataTable is
 *   server-driven — `data` must be the pre-sorted slice the server returned.
 */
export function useDataTable<T>(options: UseDataTableOptions<T>): DataTableInstance<T> {
  const {
    data,
    pinnedRows = [],
    columns,
    getRowId,
    rowCount,
    enableRowSelection = false,
    onRowClick,
    renderExpandedRow,
  } = options;

  const defaultColumnOrder = useMemo(
    () => options.defaultColumnOrder ?? columns.map((c) => c.id),
    // Intentionally not depending on `columns` — defaultColumnOrder is a
    // one-time initial value. If columns change identity, consumer must
    // pass a controlled columnOrder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Initial pinning derived from `ColumnDef.pin` when the consumer didn't
  // pass `defaultColumnPinning`. Like `defaultColumnOrder`, this is a one-time
  // initial value — after mount, runtime calls to `instance.pinColumn(...)`
  // update the controllable state and take over.
  const derivedColumnPinning = useMemo<ColumnPinningState>(
    () => {
      const left: string[] = [];
      const right: string[] = [];
      for (const c of columns) {
        if (c.pin === 'left') left.push(c.id);
        else if (c.pin === 'right') right.push(c.id);
      }
      return left.length === 0 && right.length === 0 ? EMPTY_PINNING : { left, right };
    },
    // Same one-time-init rationale as defaultColumnOrder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [columnOrder, setColumnOrder] = useControllableState<ColumnOrderState>({
    value: options.columnOrder,
    defaultValue: defaultColumnOrder,
    onChange: options.onColumnOrderChange,
  });

  const [columnSizing, setColumnSizing] = useControllableState<ColumnSizingState>({
    value: options.columnSizing,
    defaultValue: options.defaultColumnSizing ?? {},
    onChange: options.onColumnSizingChange,
  });

  const [columnVisibility, setColumnVisibility] = useControllableState<ColumnVisibilityState>({
    value: options.columnVisibility,
    defaultValue: options.defaultColumnVisibility ?? {},
    onChange: options.onColumnVisibilityChange,
  });

  const [columnPinning, setColumnPinning] = useControllableState<ColumnPinningState>({
    value: options.columnPinning,
    defaultValue: options.defaultColumnPinning ?? derivedColumnPinning,
    onChange: options.onColumnPinningChange,
  });

  const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>({
    value: options.rowSelection,
    defaultValue: options.defaultRowSelection ?? {},
    onChange: options.onRowSelectionChange,
  });

  const [expandedRows, setExpandedRows] = useControllableState<ExpandedRowsState>({
    value: options.expandedRows,
    defaultValue: options.defaultExpandedRows ?? {},
    onChange: options.onExpandedRowsChange,
  });

  const [sort, setSort] = useControllableState<SortState | null>({
    value: options.sort,
    defaultValue: options.defaultSort ?? null,
    onChange: options.onSortChange,
  });

  const DEFAULT_COL_WIDTH = 120;

  const columnsById = useMemo(() => {
    const m = new Map<string, (typeof columns)[number]>();
    for (const c of columns) m.set(c.id, c);
    return m;
  }, [columns]);

  // columnSizesPx: id → resolved width (sizing state > ColumnDef.size > default)
  const columnSizesPx = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const c of columns) {
      out[c.id] = columnSizing[c.id] ?? c.size ?? DEFAULT_COL_WIDTH;
    }
    return out;
  }, [columns, columnSizing]);

  // visibleColumns: ordered (per columnOrder) and filtered (visibility !== false)
  const visibleColumns = useMemo(() => {
    const isVisible = (id: string) => columnVisibility[id] !== false;
    const ordered: typeof columns = [];
    for (const id of columnOrder) {
      const col = columnsById.get(id);
      if (col && isVisible(id)) ordered.push(col);
    }
    // Any column not in columnOrder (e.g. added after init) goes to the end.
    for (const c of columns) {
      if (!columnOrder.includes(c.id) && isVisible(c.id)) ordered.push(c);
    }
    return ordered;
  }, [columns, columnsById, columnOrder, columnVisibility]);

  // Pin grouping. Pinning order within a side is given by columnPinning.left/right.
  const leftPinnedColumns = useMemo(
    () =>
      columnPinning.left
        .map((id) => columnsById.get(id))
        .filter((c): c is (typeof columns)[number] => !!c && columnVisibility[c.id] !== false),
    [columnPinning.left, columnsById, columnVisibility],
  );

  const rightPinnedColumns = useMemo(
    () =>
      columnPinning.right
        .map((id) => columnsById.get(id))
        .filter((c): c is (typeof columns)[number] => !!c && columnVisibility[c.id] !== false),
    [columnPinning.right, columnsById, columnVisibility],
  );

  const unpinnedColumns = useMemo(() => {
    const pinned = new Set([...columnPinning.left, ...columnPinning.right]);
    return visibleColumns.filter((c) => !pinned.has(c.id));
  }, [visibleColumns, columnPinning.left, columnPinning.right]);

  // Pin offsets — cumulative widths from the pinned edge inward.
  const leftPinOffsets = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    let acc = 0;
    for (const col of leftPinnedColumns) {
      out[col.id] = acc;
      acc += columnSizesPx[col.id] ?? DEFAULT_COL_WIDTH;
    }
    return out;
  }, [leftPinnedColumns, columnSizesPx]);

  const rightPinOffsets = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    let acc = 0;
    // Rightmost pinned column has offset 0; walk right-to-left accumulating.
    for (let i = rightPinnedColumns.length - 1; i >= 0; i--) {
      const col = rightPinnedColumns[i]!;
      out[col.id] = acc;
      acc += columnSizesPx[col.id] ?? DEFAULT_COL_WIDTH;
    }
    return out;
  }, [rightPinnedColumns, columnSizesPx]);

  const toggleRowSelection = useCallback(
    (rowId: string) => {
      setRowSelection((prev) => {
        const next = { ...prev };
        if (next[rowId]) delete next[rowId];
        else next[rowId] = true;
        return next;
      });
    },
    [setRowSelection],
  );

  const toggleAllOnPage = useCallback(() => {
    setRowSelection((prev) => {
      const pageIds = data.map(getRowId);
      const allSelected = pageIds.every((id) => prev[id]);
      if (allSelected) {
        const next = { ...prev };
        for (const id of pageIds) delete next[id];
        return next;
      }
      const next = { ...prev };
      for (const id of pageIds) next[id] = true;
      return next;
    });
  }, [data, getRowId, setRowSelection]);

  const isAllOnPageSelected = useCallback(() => {
    if (data.length === 0) return false;
    return data.every((row) => rowSelection[getRowId(row)] === true);
  }, [data, getRowId, rowSelection]);

  const isSomeOnPageSelected = useCallback(() => {
    if (data.length === 0) return false;
    let some = false;
    let all = true;
    for (const row of data) {
      if (rowSelection[getRowId(row)]) some = true;
      else all = false;
    }
    return some && !all;
  }, [data, getRowId, rowSelection]);

  const toggleRowExpanded = useCallback(
    (rowId: string) => {
      setExpandedRows((prev) => {
        const next = { ...prev };
        if (next[rowId]) delete next[rowId];
        else next[rowId] = true;
        return next;
      });
    },
    [setExpandedRows],
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: prev[columnId] === false ? true : false,
      }));
    },
    [setColumnVisibility],
  );

  const pinColumn = useCallback(
    (columnId: string, side: 'left' | 'right' | false) => {
      setColumnPinning((prev) => {
        const left = prev.left.filter((id) => id !== columnId);
        const right = prev.right.filter((id) => id !== columnId);
        if (side === 'left') left.push(columnId);
        else if (side === 'right') right.push(columnId);
        return { left, right };
      });
    },
    [setColumnPinning],
  );

  const toggleSort = useCallback(
    (columnId: string) => {
      setSort((prev) => {
        if (!prev || prev.columnId !== columnId) {
          return { columnId, direction: 'asc' };
        }
        if (prev.direction === 'asc') return { columnId, direction: 'desc' };
        return null;
      });
    },
    [setSort],
  );

  return {
    data,
    pinnedRows,
    columns,
    getRowId,
    rowCount,
    enableRowSelection,
    hasExpansion: renderExpandedRow != null,
    onRowClick,
    renderExpandedRow,

    columnOrder,
    columnSizing,
    columnVisibility,
    columnPinning,
    rowSelection,
    expandedRows,
    sort,

    visibleColumns,
    leftPinnedColumns,
    rightPinnedColumns,
    unpinnedColumns,
    columnSizesPx,
    leftPinOffsets,
    rightPinOffsets,

    setColumnOrder,
    setColumnSizing,
    setColumnVisibility,
    setColumnPinning,
    setRowSelection,
    setExpandedRows,
    setSort,

    toggleRowSelection,
    toggleAllOnPage,
    isAllOnPageSelected,
    isSomeOnPageSelected,
    toggleRowExpanded,
    toggleColumnVisibility,
    pinColumn,
    toggleSort,
  };
}
