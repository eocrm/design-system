import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react';

/** Cell / header text alignment. */
export type ColumnAlign = 'start' | 'center' | 'end';

/** Single-column sort state. v1 is single-column only; multi-column is a future extension. */
export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

/** Ordered list of column ids (includes hidden columns at their absolute positions). */
export type ColumnOrderState = string[];

/** Map column id → resolved width in px. Missing entries fall back to `ColumnDef.size` or the default (120). */
export type ColumnSizingState = Record<string, number>;

/** Map column id → visible flag. Missing entries are treated as `true` (visible). */
export type ColumnVisibilityState = Record<string, boolean>;

/**
 * Ordered pin lists per side. Phase 1 plumbs this state but does not render
 * the sticky CSS — rendering effects ship in Phase 2.
 */
export interface ColumnPinningState {
  left: string[];
  right: string[];
}

/** Map row id → selected flag. Missing entries treated as `false`. */
export type RowSelectionState = Record<string, boolean>;

/** Map row id → expanded flag. Phase 1 plumbs state; rendering ships in Phase 3. */
export type ExpandedRowsState = Record<string, boolean>;

/** setState-style updater: either the next value, or a function (prev) => next. */
export type Updater<S> = S | ((prev: S) => S);

/** Header render-prop context. */
export interface HeaderContext<T = unknown> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

/** Cell render-prop context. */
export interface CellContext<T> {
  row: T;
  rowId: string;
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

/** Descriptor for one column. Keyed by `id` — used as the key for all per-column state. */
export interface ColumnDef<T> {
  /** Stable id. Used as key for column order, sizing, visibility, pinning state. */
  id: string;
  /** Header content. String, node, or a render-prop receiving HeaderContext. */
  header: ReactNode | ((ctx: HeaderContext<T>) => ReactNode);
  /** Cell content for a row. */
  cell: (row: T, ctx: CellContext<T>) => ReactNode;
  /** Cell text alignment. Defaults to 'start'. */
  align?: ColumnAlign;
  /** Default width in px when no entry in ColumnSizingState. Defaults to 120. */
  size?: number;
  /** Min width during resize (px). Defaults to 40. */
  minSize?: number;
  /** Max width during resize (px). Defaults to undefined (no max). */
  maxSize?: number;
  /** Whether the column can be reordered via drag. Defaults true. */
  enableReorder?: boolean;
  /** Whether the column can be resized via the handle. Defaults true. */
  enableResize?: boolean;
  /** Whether the column can be hidden via the visibility menu. Defaults true. */
  enableHide?: boolean;
  /** Whether the column can be pinned. Defaults true. (Phase 2 will use this.) */
  enablePin?: boolean;
  /**
   * Server-side sortable. When true, the header label is clickable and
   * keyboard-actionable; toggling fires onSortChange. DataTable does
   * not perform client-side sorting.
   */
  sortable?: boolean;
  /** Label shown in the column visibility menu. Falls back to `header` if string. */
  visibilityLabel?: string;
}

/** Public options to `useDataTable<T>(...)`. */
export interface UseDataTableOptions<T> {
  // pure data
  data: T[];
  pinnedRows?: T[];
  columns: ColumnDef<T>[];
  /** Required. Stable id per row — used by selection, expansion, and `getRowId`. */
  getRowId: (row: T) => string;
  /** Total server-side row count. Surfaced as `aria-rowcount` for screen readers. */
  rowCount?: number;
  /** Opt-in to the selection auto-column. Defaults false. */
  enableRowSelection?: boolean;

  // each state piece: controlled / default / onChange (Radix pattern)
  columnOrder?: ColumnOrderState;
  defaultColumnOrder?: ColumnOrderState;
  onColumnOrderChange?: (next: ColumnOrderState) => void;

  columnSizing?: ColumnSizingState;
  defaultColumnSizing?: ColumnSizingState;
  onColumnSizingChange?: (next: ColumnSizingState) => void;

  columnVisibility?: ColumnVisibilityState;
  defaultColumnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (next: ColumnVisibilityState) => void;

  columnPinning?: ColumnPinningState;
  defaultColumnPinning?: ColumnPinningState;
  onColumnPinningChange?: (next: ColumnPinningState) => void;

  rowSelection?: RowSelectionState;
  defaultRowSelection?: RowSelectionState;
  onRowSelectionChange?: (next: RowSelectionState) => void;

  expandedRows?: ExpandedRowsState;
  defaultExpandedRows?: ExpandedRowsState;
  onExpandedRowsChange?: (next: ExpandedRowsState) => void;

  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;

  // interactivity
  onRowClick?: (row: T, event: ReactMouseEvent<HTMLTableRowElement>) => void;
  /** Phase 1 plumbs this prop but does not render expansion. Rendering ships in Phase 3. */
  renderExpandedRow?: (row: T) => ReactNode;
}

/** Returned by `useDataTable<T>(...)`. Passed into `<DataTable instance={...} />`. */
export interface DataTableInstance<T> {
  // echoed inputs
  data: T[];
  pinnedRows: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  rowCount?: number;
  enableRowSelection: boolean;
  hasExpansion: boolean;
  onRowClick?: UseDataTableOptions<T>['onRowClick'];
  renderExpandedRow?: UseDataTableOptions<T>['renderExpandedRow'];

  // resolved current state
  columnOrder: ColumnOrderState;
  columnSizing: ColumnSizingState;
  columnVisibility: ColumnVisibilityState;
  columnPinning: ColumnPinningState;
  rowSelection: RowSelectionState;
  expandedRows: ExpandedRowsState;
  sort: SortState | null;

  // derived view-models (memoized)
  visibleColumns: ColumnDef<T>[];
  leftPinnedColumns: ColumnDef<T>[];
  rightPinnedColumns: ColumnDef<T>[];
  unpinnedColumns: ColumnDef<T>[];
  columnSizesPx: Record<string, number>;
  leftPinOffsets: Record<string, number>;
  rightPinOffsets: Record<string, number>;

  // setState-style mutators
  setColumnOrder: (updater: Updater<ColumnOrderState>) => void;
  setColumnSizing: (updater: Updater<ColumnSizingState>) => void;
  setColumnVisibility: (updater: Updater<ColumnVisibilityState>) => void;
  setColumnPinning: (updater: Updater<ColumnPinningState>) => void;
  setRowSelection: (updater: Updater<RowSelectionState>) => void;
  setExpandedRows: (updater: Updater<ExpandedRowsState>) => void;
  setSort: (updater: Updater<SortState | null>) => void;

  // higher-level helpers
  toggleRowSelection: (rowId: string) => void;
  toggleAllOnPage: () => void;
  isAllOnPageSelected: () => boolean;
  isSomeOnPageSelected: () => boolean;
  toggleRowExpanded: (rowId: string) => void;
  toggleColumnVisibility: (columnId: string) => void;
  pinColumn: (columnId: string, side: 'left' | 'right' | false) => void;
  toggleSort: (columnId: string) => void;
}
