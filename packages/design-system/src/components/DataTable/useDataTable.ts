import { useMemo } from 'react';
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
    defaultValue: options.defaultColumnPinning ?? EMPTY_PINNING,
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

  const noop = () => {};

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

    toggleRowSelection: noop,
    toggleAllOnPage: noop,
    isAllOnPageSelected: () => false,
    isSomeOnPageSelected: () => false,
    toggleRowExpanded: noop,
    toggleColumnVisibility: noop,
    pinColumn: noop,
    toggleSort: noop,
  };
}
