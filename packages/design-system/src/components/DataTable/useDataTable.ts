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

  // Derived view-models and helper methods land in subsequent tasks (5 & 6).
  // For now, stubs that satisfy the interface.
  const visibleColumns = columns;
  const leftPinnedColumns: typeof columns = [];
  const rightPinnedColumns: typeof columns = [];
  const unpinnedColumns = columns;
  const columnSizesPx: Record<string, number> = {};
  const leftPinOffsets: Record<string, number> = {};
  const rightPinOffsets: Record<string, number> = {};

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
