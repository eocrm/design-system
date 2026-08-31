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
  /**
   * Plain-text column label. Used by the visibility menu and, when
   * `DataTable.collapseBelow` is set, by the visual card-field label and resize
   * separator name. Falls back to a string `header`; card fields with neither
   * stay visually unlabelled, and the visibility menu falls back to `id` —
   * that menu is the one place a column's raw id can still reach a user.
   * Resize separators do NOT: they take a generic "Resize this column".
   *
   * It also NAMES the column header, but only when `header` is not a
   * text-rendering string — i.e. a ReactNode, a render function, or `''`. So
   * `<span>Rev</span>` with `visibilityLabel: "Revenue (USD)"` announces
   * "Revenue (USD)", NOT "Rev". A string header always names itself and this
   * never overrides it.
   *
   * That override is deliberate. Deciding at runtime whether a ReactNode names
   * itself needs the accessible name, and seven attempts to approximate that
   * from the DOM each shipped either a raw `column.id` in the announcement or
   * an unnamed column header. The rule is static instead, and the cost is that
   * a node which DOES name itself is overridden when you also set this.
   *
   * Set it on every non-text header. Without it the component will not invent
   * a name: `column.id` is the only candidate left and a developer identifier
   * is not something to read aloud, so it is used for nothing — not the
   * header, not the drag grip, not the resize handle.
   *
   * What such a header announces, measured off Chromium's AX tree: it falls
   * through to NAME-FROM-CONTENT, because an `aria-labelledby` resolving to no
   * text is marked invalid rather than treated as a name. So the cell's own
   * controls name it — "Drag to reorder this column", or under `collapseBelow`
   * the resize handle's live pixel width. `header: ''` is special-cased to a
   * generic label so the width cannot win; a ReactNode that renders nothing is
   * indistinguishable from one that names itself, so it is not.
   *
   * None of those is a name you chose. Set this prop on every text-less
   * header; your axe run flags what is left via `empty-table-header`.
   */
  visibilityLabel?: string;
  /**
   * Initial pin side for this column. Used as the derived default for
   * `columnPinning` when the consumer doesn't pass `columnPinning` or
   * `defaultColumnPinning`. Lower-precedence than either — explicit
   * `defaultColumnPinning` on the hook always wins.
   *
   * Runtime pinning (e.g. `instance.pinColumn(id, 'right')`) updates the
   * `columnPinning` state and takes over from this initial value.
   */
  pin?: 'left' | 'right';
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

  /** Controlled column order. Pass with `onColumnOrderChange` to manage state externally. */
  columnOrder?: ColumnOrderState;
  /** Initial column order when uncontrolled. Defaults to `columns.map(c => c.id)`. */
  defaultColumnOrder?: ColumnOrderState;
  /** Fires when the order changes (drag-reorder or programmatic set). */
  onColumnOrderChange?: (next: ColumnOrderState) => void;

  /** Controlled column sizing map (column id → width in px). Pass with `onColumnSizingChange`. */
  columnSizing?: ColumnSizingState;
  /** Initial column sizing when uncontrolled. Missing entries fall back to `ColumnDef.size` or 120px. */
  defaultColumnSizing?: ColumnSizingState;
  /** Fires when any column is resized. */
  onColumnSizingChange?: (next: ColumnSizingState) => void;

  /** Controlled column visibility map (column id → visible flag). Pass with `onColumnVisibilityChange`. */
  columnVisibility?: ColumnVisibilityState;
  /** Initial column visibility when uncontrolled. Missing entries are treated as visible. */
  defaultColumnVisibility?: ColumnVisibilityState;
  /** Fires when column visibility toggles (e.g. via `<ColumnVisibilityTrigger>`). */
  onColumnVisibilityChange?: (next: ColumnVisibilityState) => void;

  /**
   * Controlled column pinning state. Pass with `onColumnPinningChange`.
   * Note: Phase 1 plumbs this state — sticky rendering ships in Phase 2.
   */
  columnPinning?: ColumnPinningState;
  /**
   * Initial column pinning when uncontrolled. Defaults to `{ left: [], right: [] }`.
   * Note: Phase 1 plumbs this state — sticky rendering ships in Phase 2.
   */
  defaultColumnPinning?: ColumnPinningState;
  /** Fires when a column is pinned or unpinned. */
  onColumnPinningChange?: (next: ColumnPinningState) => void;

  /** Controlled row selection map (row id → selected flag). Pass with `onRowSelectionChange`. */
  rowSelection?: RowSelectionState;
  /** Initial row selection when uncontrolled. Defaults to `{}` (nothing selected). */
  defaultRowSelection?: RowSelectionState;
  /** Fires when any row selection changes (per-row toggle or select-all). */
  onRowSelectionChange?: (next: RowSelectionState) => void;

  /**
   * Controlled expanded-rows map (row id → expanded flag). Pass with `onExpandedRowsChange`.
   * Note: Phase 1 plumbs this state — expansion rendering ships in Phase 3.
   */
  expandedRows?: ExpandedRowsState;
  /**
   * Initial expanded rows when uncontrolled. Defaults to `{}` (all collapsed).
   * Note: Phase 1 plumbs this state — expansion rendering ships in Phase 3.
   */
  defaultExpandedRows?: ExpandedRowsState;
  /** Fires when a row is expanded or collapsed. */
  onExpandedRowsChange?: (next: ExpandedRowsState) => void;

  /** Controlled single-column sort state. Pass with `onSortChange` for server-driven sorting. */
  sort?: SortState | null;
  /** Initial sort when uncontrolled. Defaults to `null` (unsorted). */
  defaultSort?: SortState | null;
  /** Fires when the sort state changes (column header click cycles null → asc → desc → null). */
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
  /** Toggle selection of a single row by id. */
  toggleRowSelection: (rowId: string) => void;
  /** Toggle selection of all rows in `data` (does not affect `pinnedRows`). */
  toggleAllOnPage: () => void;
  /** All rows in `data` are selected (excludes `pinnedRows`). */
  isAllOnPageSelected: () => boolean;
  /** Some but not all rows in `data` are selected — drives the header checkbox indeterminate state. */
  isSomeOnPageSelected: () => boolean;
  /** Toggle expansion of a single row by id. */
  toggleRowExpanded: (rowId: string) => void;
  /** Toggle visibility of a column by id. Guarded against hiding the last visible hidable column when called via `<ColumnVisibilityTrigger>`. */
  toggleColumnVisibility: (columnId: string) => void;
  /** Pin a column to `left`, `right`, or `false` to unpin. Pinning order within a side is append-on-pin. */
  pinColumn: (columnId: string, side: 'left' | 'right' | false) => void;
  /** Cycle sort state for a column: null → asc → desc → null. */
  toggleSort: (columnId: string) => void;
}
