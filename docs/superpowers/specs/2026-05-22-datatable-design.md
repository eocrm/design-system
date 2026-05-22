# DataTable — design spec

**Date:** 2026-05-22
**Branch:** `feat/datatable`
**Scope:** `<DataTable>` component + `useDataTable` hook + `<DataTable.ColumnVisibilityTrigger>` companion. Server-driven sort/search/pagination. Features: column ordering, sizing, visibility, pinning; row selection, row click, expandable rows, row pinning; sticky header.

## Goal

A composition over the existing `<Table>` primitive that owns the column-axis state machine (order, sizing, visibility, pinning) and row-axis state machine (selection, expansion). Consumer remains responsible for fetching data, paginating, and sorting via the server.

The component is config-driven on the column axis (`columns: ColumnDef<T>[]`) because column-state features cannot work with JSX children — columns are an array, not a tree.

## Why now

- The CRM has several pages where a sortable, resizable, user-customizable table is the dominant UI. Each one rolling its own causes drift and bugs.
- All the prerequisite primitives are in place: `<Table>`, `<DropdownMenu>` (with `CheckboxItem`), `<Popover>`, `<Checkbox>`, `<EmptyState>`, `<Skeleton>`, `<Pagination>`.
- `@floating-ui/react-dom` already in the dep graph (used by `DropdownMenu` and `Popover`).

## Non-goals (v1)

- **No TanStack Table.** The project's `packages/design-system/CLAUDE.md` explicitly carves out TanStack as acceptable for this case ("behavioral hook, not a UI library"). User has overridden that policy for this build — own state machine instead.
- **No multi-column sort.** Single-column only. Sort state shape kept extensible: `SortState | null` today, could become `SortState[]` later.
- **No client-side sort / filter / search.** Server is the source of truth. DataTable emits change events; consumer fetches.
- **No virtualized rendering.** Hundreds of rows per page is fine; 10k+ rows on one page will hit perf limits — defer to a future phase using `react-window` or equivalent.
- **No cell editing, no cell selection.** Display only.
- **No column groups / multi-level headers.** Single header row.
- **No drag-to-reorder rows, no drag-to-pin rows.** Programmatic only via consumer-provided UI.
- **No export-to-CSV / clipboard.** Not a DataTable concern.
- **No persistence helpers** (localStorage / URL state). Consumer wires using controlled-state callbacks.
- **No built-in pagination UI.** Existing `<Pagination>` composes outside DataTable. Same for bulk-action toolbar.
- **No built-in column-pin UI in v1.** Consumer wires using `instance.pinColumn(id, side)`. Recommended recipe documented in JSDoc.

## Architecture

### Dependencies

Three new packages (all behavioral, no UI):

- `@dnd-kit/core` (~10KB) — DnD primitives + `KeyboardSensor` (a11y) + `<DragOverlay>`
- `@dnd-kit/sortable` (~5KB) — `useSortable`, `SortableContext`, `horizontalListSortingStrategy`
- `@dnd-kit/utilities` (~1KB) — `CSS.Transform.toString` helper

Total ~16KB gzipped added. Justified by the same rationale as `@floating-ui/react-dom`: behavioral hook, not a UI library. Hand-rolling DnD with keyboard a11y + screen-reader announcements + autoscroll would cost ~500 LoC of well-tested-elsewhere logic.

### File layout

```
packages/design-system/src/components/DataTable/
  DataTable.tsx                       ← <DataTable> component
  DataTable.module.scss
  DataTable.test.tsx
  useDataTable.ts                     ← hook (state machine)
  useDataTable.test.ts                ← pure-logic unit tests
  ColumnVisibilityTrigger.tsx
  ColumnVisibilityTrigger.module.scss
  ColumnVisibilityTrigger.test.tsx
  types.ts                            ← ColumnDef<T>, state types, instance type
  _internal/
    HeaderCell.tsx                    ← sortable header cell (drag handle, resize, sort)
    HeaderCell.module.scss
    BodyRow.tsx                       ← row renderer (select cell, expand cell, data cells)
    PinnedRowsSection.tsx             ← separate <tbody> for pinned rows
    DragOverlay.tsx                   ← drop indicator portal during column drag
    useColumnPinningOffsets.ts        ← pure: column widths → sticky left/right offsets
    useResizeHandle.ts                ← pointer-based resize handle hook
  index.ts                            ← public re-exports
```

### Exports (added to `src/index.ts`)

```ts
export { DataTable, useDataTable } from './components/DataTable';
export type {
  DataTableProps,
  DataTableInstance,
  UseDataTableOptions,
  ColumnDef,
  ColumnAlign,
  ColumnOrderState,
  ColumnSizingState,
  ColumnVisibilityState,
  ColumnPinningState,
  ExpandedRowsState,
  RowSelectionState,
  SortState,
  HeaderContext,
  CellContext,
} from './components/DataTable';
```

### Composition

- `<Table>` compound for table markup (uses its `scroll`, `stickyHeader`, `hover`, `density`, `striped`, `bordered` modifiers)
- `<DropdownMenu>` + `<DropdownMenu.CheckboxItem>` for column visibility menu
- `<Checkbox>` for selection cells (indeterminate via existing prop)
- `<EmptyState>` for empty-data state
- `<Skeleton variant="text">` for loading rows
- `<Pagination>` is **not** composed — consumer renders it outside

## Public API

### `ColumnDef<T>`

```ts
export type ColumnAlign = 'start' | 'center' | 'end';

export interface HeaderContext<T = unknown> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

export interface CellContext<T> {
  row: T;
  rowId: string;
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

export interface ColumnDef<T> {
  /** Stable id — keys all per-column state (order, size, visibility, pin). */
  id: string;

  /** Header content. String, ReactNode, or render-prop. */
  header: ReactNode | ((ctx: HeaderContext<T>) => ReactNode);

  /** Cell content for a row. */
  cell: (row: T, ctx: CellContext<T>) => ReactNode;

  /** Cell text alignment. Defaults to 'start'. */
  align?: ColumnAlign;

  /** Default width in px. Defaults to 120. */
  size?: number;
  /** Min width during resize (px). Defaults to 40. */
  minSize?: number;
  /** Max width during resize (px). Defaults to undefined (no max). */
  maxSize?: number;

  /** Per-column opt-outs (all default true). */
  enableReorder?: boolean;
  enableResize?: boolean;
  enableHide?: boolean;
  enablePin?: boolean;

  /**
   * Mark column as server-sortable. When true, header is clickable and
   * keyboard-actionable, and toggling fires onSortChange. DataTable
   * never performs client-side sorting.
   */
  sortable?: boolean;

  /** Label for the column visibility menu. Falls back to `header` if string. */
  visibilityLabel?: string;
}
```

No `accessor` shortcut — `cell: (row) => row.foo` is one extra character and avoids `keyof T` complexity. Wait until a consumer asks.

`getRowId` lives on `UseDataTableOptions<T>` (the hook), not on `DataTableProps` or `ColumnDef`. It's required — no implicit `row.id` fallback. Keeps the row type unconstrained.

### State types

```ts
export type ColumnOrderState = string[]; // ordered ids (includes hidden)
export type ColumnSizingState = Record<string, number>; // id → width px
export type ColumnVisibilityState = Record<string, boolean>; // id → visible (missing = visible)
export type ColumnPinningState = { left: string[]; right: string[] }; // ordered per side

export type RowSelectionState = Record<string, boolean>; // rowId → selected (missing = false)
export type ExpandedRowsState = Record<string, boolean>; // rowId → expanded

export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}
```

`SortState | null` for the sort prop — `null` = unsorted.

### `useDataTable<T>(options)`

```ts
export type Updater<S> = S | ((prev: S) => S);

export interface UseDataTableOptions<T> {
  // Pure data
  data: T[];
  pinnedRows?: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string; // required
  rowCount?: number; // total server-side count (a11y metadata)

  // Feature toggles
  enableRowSelection?: boolean; // default false — must opt in
  // expansion is implicitly enabled when renderExpandedRow is passed

  // Controlled / uncontrolled state (one trio per piece)
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

  // Interactivity
  onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  renderExpandedRow?: (row: T) => ReactNode;
}

export interface DataTableInstance<T> {
  // Echoed inputs
  data: T[];
  pinnedRows: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  enableRowSelection: boolean;
  hasExpansion: boolean; // true when renderExpandedRow was provided
  onRowClick?: UseDataTableOptions<T>['onRowClick'];
  renderExpandedRow?: UseDataTableOptions<T>['renderExpandedRow'];

  // Resolved current state
  columnOrder: ColumnOrderState;
  columnSizing: ColumnSizingState;
  columnVisibility: ColumnVisibilityState;
  columnPinning: ColumnPinningState;
  rowSelection: RowSelectionState;
  expandedRows: ExpandedRowsState;
  sort: SortState | null;

  // Derived view-models (memoized)
  visibleColumns: ColumnDef<T>[]; // filtered by visibility, sorted by order
  leftPinnedColumns: ColumnDef<T>[];
  rightPinnedColumns: ColumnDef<T>[];
  unpinnedColumns: ColumnDef<T>[];
  columnSizesPx: Record<string, number>; // id → resolved px width
  leftPinOffsets: Record<string, number>; // id → cumulative left px
  rightPinOffsets: Record<string, number>; // id → cumulative right px

  // setState-style mutators (always route through onChange or internal setState)
  setColumnOrder(updater: Updater<ColumnOrderState>): void;
  setColumnSizing(updater: Updater<ColumnSizingState>): void;
  setColumnVisibility(updater: Updater<ColumnVisibilityState>): void;
  setColumnPinning(updater: Updater<ColumnPinningState>): void;
  setRowSelection(updater: Updater<RowSelectionState>): void;
  setExpandedRows(updater: Updater<ExpandedRowsState>): void;
  setSort(updater: Updater<SortState | null>): void;

  // Higher-level helpers
  toggleRowSelection(rowId: string): void;
  toggleAllOnPage(): void; // toggles select-state of all rows in `data` (ignores pinnedRows)
  isAllOnPageSelected(): boolean;
  isSomeOnPageSelected(): boolean; // → indeterminate for header checkbox
  toggleRowExpanded(rowId: string): void;
  toggleColumnVisibility(columnId: string): void;
  pinColumn(columnId: string, side: 'left' | 'right' | false): void;
  toggleSort(columnId: string): void; // cycles: null → asc → desc → null
}
```

### `<DataTable>` component

```ts
export interface DataTableProps<T> {
  instance: DataTableInstance<T>;

  // Passthrough to underlying <Table>
  density?: TableDensity; // default 'comfortable'
  striped?: boolean;
  hover?: boolean; // default TRUE (DataTable rows are usually interactive)
  bordered?: boolean;

  // State decorations
  loading?: boolean;
  loadingRowCount?: number; // default 10
  emptyState?: ReactNode; // default: a sensible <EmptyState>

  // a11y
  'aria-label'?: string; // required when no <caption>
  caption?: ReactNode; // alternative — renders as <Table.Caption>

  // Passthrough
  className?: string;
}
```

### `<DataTable.ColumnVisibilityTrigger>`

```ts
export interface ColumnVisibilityTriggerProps {
  instance: DataTableInstance<any>;
  label?: ReactNode; // default "Columns"
  icon?: ReactNode; // default Columns icon from lucide
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
}
```

Renders `<Button variant="ghost">` → `<DropdownMenu>` with one `<DropdownMenu.CheckboxItem>` per column where `enableHide !== false`. Toggling fires `instance.toggleColumnVisibility(id)`.

**Last-visible-column guard**: the checkbox item for the currently-only-visible-hidable column is rendered with `disabled` to prevent hiding every data column. Columns with `enableHide: false` (always visible by config) are not counted in this guard and are absent from the menu.

## Rendering pipeline

### DOM structure

```
<Table scroll stickyHeader hover>
  <colgroup>
    [<col width=44 />]    ← auto: select column (if enableRowSelection)
    [<col width=44 />]    ← auto: expand column (if hasExpansion)
    <col width={size} />  ← per visible data column, in resolved order
    ...
  </colgroup>

  <Table.Header>
    <Table.Row>
      [select-all header cell]  ← <Checkbox> with indeterminate
      [expand header cell]      ← empty, fixed width
      [<HeaderCell column={c} /> per visible column, in resolved order]
    </Table.Row>
  </Table.Header>

  [<Table.Body className={styles.pinnedRowsTbody}>  ← only when pinnedRows.length > 0
    [<BodyRow row={r} pinned /> per pinned row]
  </Table.Body>]

  <Table.Body className={styles.mainTbody}>
    {loading
      ? skeletonRows
      : isEmpty
      ? emptyRow
      : data.flatMap(row => [
          <BodyRow row={row} />,
          row is expanded && <ExpandedDetailRow row={row} />,
        ])}
  </Table.Body>
</Table>
```

### Auto-prepended leading cells

- **Selection cell**: appears iff `enableRowSelection === true`. 44px fixed width. Always at the leftmost position (before any left-pinned data column). Locked: not in `columnOrder`, not reorderable / resizable / hidable / pinnable. From Phase 2 onward, auto-left-pinned (contributes to left-pin offset stack); in Phase 1 it just sits at the left without sticky positioning.
- **Expand cell**: appears iff `renderExpandedRow` is provided. 44px fixed width. Same locking rules and sticky behavior as the selection cell. Always rendered to the right of the selection cell, to the left of all data columns. Introduced in Phase 3 along with the rest of the expansion feature.

Mental model: `[ table-affordances ][ left-pinned data ][ scrollable data ][ right-pinned data ]`.

### Column pinning

CSS `position: sticky` with computed `left` or `right` offsets. Offsets computed in `useColumnPinningOffsets.ts` from current `columnSizesPx`.

Edge shadow is **always-on**, not scroll-aware (4px shadow on inside edge of pinned section). Scroll-aware shadows would require per-column `IntersectionObserver` and add complexity for marginal UX win.

**Z-index stacking** at the sticky-header / pinned-column intersection: pinned-column body cells `z-index: 1` (above unpinned body), sticky header `z-index: 2` (above body), pinned-column header cells `z-index: 3` (top-left/top-right corners win over everything). Pinned-rows section sits above main `<tbody>` in DOM order but its cells get `z-index: 1` to stay above unpinned scrolling content.

Cross-pin-boundary drag drops are **rejected** (drop target invalidated). Consumer can override via `instance.pinColumn(id, side)` after a drop if a different policy is wanted.

### Pinned rows

Separate `<Table.Body>` rendered before the main body. No vertical-sticky positioning (rendering above the body is sufficient given the "always-visible across pagination/sort" semantics). Each pinned row respects column pinning + sizing exactly like main rows. Subtle background tint via `--color-bg-row-pinned`.

`toggleAllOnPage` does **not** affect pinned rows — they're conceptually a different "page" (their own server query). Pinned-row selection toggles per-row via the row checkbox.

**Duplicate row handling**: if a row appears in both `data` and `pinnedRows` (same `getRowId` value), it renders in **both** places — once in the pinned section, once in its natural place in the main body. To dedupe, consumer filters `data` to exclude pinned ids before passing. DataTable does not auto-dedupe because the "starred row also visible inline" UX is sometimes desired.

### Expanded row

When `expandedRows[rowId]` is true, render an extra `<Table.Row>` immediately after the data row, with a single `<Table.Cell colSpan={totalColumnsIncludingAuto}>` containing `renderExpandedRow(row)`.

Expand chevron button lives in the auto-expand cell. Fires `instance.toggleRowExpanded(rowId)`. Sets `aria-expanded` on chevron; sets `aria-controls={detailRowId}` linking chevron to the detail row.

### Empty + loading states

- **Loading** (`loading: true`): render `loadingRowCount` (default 10) skeleton rows. Each data cell wraps a `<Skeleton variant="text">`. Header renders normally. Pinned rows render normally (they're separate data — consumer holds them back if not ready).
- **Empty** (`!loading && data.length === 0 && pinnedRows.length === 0`): render one `<Table.Row><Table.Cell colSpan={...}>` containing the `emptyState` prop, or a default `<EmptyState title="No data" />`.

## Interactions & a11y

### Header cell anatomy (hover-revealed grip)

- **Default state**: label + sort indicator only. Clean.
- **Hover/focus state**: grip icon (⋮⋮) fades in on the left. Cursor over grip = `grab`.
- **Click on label area**: toggles sort (when `sortable: true`). Cycles `null → asc → desc → null`.
- **Resize handle**: 6px-wide pointer hit zone on the right edge. Hover shows a 2px accent-color bar. `pointerdown` + drag adjusts width clamped to `[minSize, maxSize]`.

### Drag-to-reorder (using `@dnd-kit/sortable`)

- **Sensors**: `PointerSensor` with `activationConstraint: { distance: 6 }` + `KeyboardSensor` from `@dnd-kit/sortable/sortable-keyboard-coordinates`. The 6px distance is a tolerance against misreading a grip click as a drag — drag listeners are attached **only** to the grip element, not the header label, so label clicks (sort) never compete with drag activation.
- **Strategy**: `horizontalListSortingStrategy` — adjacent columns animate to their new positions in real time as the drag moves.
- **Hidden columns during reorder**: `columnOrder` contains all column ids (visible + hidden). dnd-kit only sees visible columns. When a reorder happens, the new visible-only order is spliced back into `columnOrder` by replacing the visible-column slots one-by-one in place. Hidden columns retain their absolute positions in `columnOrder`.
- **Drag overlay**: portal-mounted semi-transparent copy of the dragged header via `<DragOverlay>`. Receives `cursor: grabbing` + a subtle elevation shadow.
- **Autoscroll during drag**: dnd-kit's built-in modifier.
- **Cross-pin-boundary drops**: rejected. Dragging a left-pinned column over an unpinned column → drop is canceled; column returns to origin. Dragging an unpinned column into the left-pinned region → same.
- **Non-reorderable columns** (`enableReorder: false`): no `useSortable` attached. Cannot be dragged. Other columns cannot be dragged past them — they're fixed positions in the order.

### Resize handle (hand-rolled, ~80 LoC)

- `pointerdown` → capture pointer, record initial X + initial width.
- `pointermove` → update `columnSizing` via `instance.setColumnSizing(prev => ({ ...prev, [id]: clamp(initial + delta, minSize, maxSize) }))`.
- `pointerup` / `pointercancel` → release capture.
- Keyboard alternative: focused header `←` / `→` resize by 8px; Shift+`←` / Shift+`→` by 32px.
- Resizing a pinned column re-flows the pin offsets in the same render.

### Keyboard a11y matrix

| Element                      | Key               | Action                                    |
| ---------------------------- | ----------------- | ----------------------------------------- |
| Header label (sortable)      | Enter / Space     | Toggle sort (cycles null → asc → desc)    |
| Header label                 | ← / →             | Resize column −/+ 8px                     |
| Header label                 | Shift+← / Shift+→ | Resize column −/+ 32px                    |
| Drag grip                    | Tab to focus      | Reveals grip (focus = hover equivalent)   |
| Drag grip                    | Space             | Pick up column (dnd-kit `KeyboardSensor`) |
| Drag grip (active)           | ← / →             | Move column                               |
| Drag grip (active)           | Space / Enter     | Drop                                      |
| Drag grip (active)           | Escape            | Cancel reorder                            |
| Selection checkbox (per-row) | Space             | Toggle row selection                      |
| Selection checkbox (header)  | Space             | Toggle all on page                        |
| Expand chevron               | Enter / Space     | Toggle expansion                          |
| Row (when `onRowClick` set)  | Enter             | Fire onRowClick                           |

dnd-kit's `KeyboardSensor` provides screen-reader announcements (`"Status column picked up at position 3 of 7"`) via a live region appended by `<DndContext>`.

### ARIA

- `<table>` gets `aria-rowcount={rowCount}` when provided (helps screen readers when paginated).
- Sortable headers get `aria-sort` via the existing `Table.HeaderCell` `sortDirection` prop.
- Expand chevron gets `aria-expanded` + `aria-controls={detailRowId}`.
- Selection checkbox gets `aria-label` referencing the row (consumer-provided via the row data or fallback to "Select row N").
- Pinned section gets `aria-label="Pinned rows"`.

### Pin/unpin UX

No built-in UI in v1. Consumer wires using `instance.pinColumn(id, side)`. Recommended recipe documented in JSDoc:

```tsx
// In the header cell or a row action menu:
<DropdownMenu>
  <DropdownMenu.Trigger>⋯</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => instance.pinColumn(column.id, 'left')}>
      Pin left
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => instance.pinColumn(column.id, 'right')}>
      Pin right
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => instance.pinColumn(column.id, false)}>
      Unpin
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```

## Tokens & styling

Likely new tokens (added to `src/styles/tokens.scss` per Rule 3):

- `--color-bg-row-pinned` — subtle tint for the pinned rows section background
- `--shadow-table-pinned-edge` — soft shadow on the inside edge of sticky columns (e.g. `0 0 8px -2px rgba(0,0,0,0.15)`)

Reused (no new tokens needed):

- `--color-fg-muted` — drag grip icon color
- `--color-accent` — resize handle hover bar
- Existing radii / spacing / typography tokens

SCSS structure inside the DataTable folder follows Rule 4 (no layout properties): widths via `<col>` style attribute (column-level), no `margin` / `position`-absolute / `flex: 1` etc. in `.module.scss`.

## Phasing

Three phases, each its own PR shipping independently:

**Phase 1 — Core + columns + selection** (largest):

- `useDataTable` hook with state plumbing for column order / sizing / visibility / selection / sort. `columnPinning` and `expandedRows` state plumbing is included but their rendering effects (sticky CSS, chevron, detail row) are deferred to phases 2 and 3 respectively.
- `<DataTable>` component (all rendering except column pinning, pinned rows, and expansion)
- Column ordering via `@dnd-kit/sortable`, sizing via hand-rolled handle, visibility
- `<DataTable.ColumnVisibilityTrigger>` companion
- Selection (checkbox column at the leftmost position; select-all with indeterminate)
- Row click handler
- Sticky header default-on
- Loading + empty states
- Sort interaction

**Phase 2 — Column & row pinning:**

- `columnPinning` state rendering: sticky CSS, offset math (`useColumnPinningOffsets`), edge shadow, z-index stacking
- Cross-pin-boundary drag rejection at the drop-target level
- Selection auto-column becomes sticky-left at this point (contributes to the offset stack)
- `pinnedRows` prop rendering (separate `<tbody>` above main)
- New tokens: `--color-bg-row-pinned`, `--shadow-table-pinned-edge`
- Tests + demo + AGENTS.md update

**Phase 3 — Expandable rows:**

- `renderExpandedRow` prop becomes operational
- Expand auto-column (chevron button, 44px, fixed left position, sticky-left from this phase forward)
- Detail row rendering (`colSpan` across all visible + auto columns)
- `aria-expanded`, `aria-controls` wiring
- Tests + demo + AGENTS.md update

## Testing strategy

### `useDataTable.test.ts` (pure logic, no DOM)

- Controlled/uncontrolled resolution per state piece (controlled wins; uncontrolled uses default + internal)
- Mutations: each `set*` and helper method round-trips through `onChange` correctly
- Derived view models: `visibleColumns`, `leftPinnedColumns` / `rightPinnedColumns` / `unpinnedColumns`, `columnSizesPx`, `leftPinOffsets` / `rightPinOffsets` (offset math edge cases)
- Sort cycling: `null → asc → desc → null`
- Selection helpers: `toggleAllOnPage` excludes `pinnedRows`; `isSomeOnPageSelected` indeterminate
- Reorder rejects cross-pin-boundary moves at the hook level

### `DataTable.test.tsx` (integration via React Testing Library)

- Renders without crashing with default props
- Controlled state round-trip (consumer state reflects mutations)
- Header sort click fires `onSortChange` with correct direction
- Selection: per-row checkbox toggles; header checkbox indeterminate when partial
- Expansion: chevron toggles, detail row renders with correct `colSpan`, `aria-expanded` set
- Pinned columns: sticky CSS class + correct `left`/`right` style per offset
- Pinned rows: separate `<tbody>` renders above main body when `pinnedRows.length > 0`
- Loading: `loadingRowCount` skeleton rows render
- Empty: `<EmptyState>` renders when `data` + `pinnedRows` both empty
- Hidden columns: cells don't render
- Ref forwarding to underlying `<table>`
- `className` merged (Rule 7)
- ARIA: `aria-rowcount`, `aria-sort`, `aria-expanded`, `aria-controls`, `aria-label="Pinned rows"`

### `ColumnVisibilityTrigger.test.tsx`

- Renders one `<DropdownMenu.CheckboxItem>` per column with `enableHide !== false`
- Toggle fires `onColumnVisibilityChange` with correct payload
- Columns with `enableHide: false` are absent from the menu

### Gap: drag-and-drop reorder is not unit-tested

dnd-kit's pointer-based DnD is genuinely hard to test in JSDOM. The playground demo serves as the smoke test. A future Playwright e2e test is the recommended remediation if reorder regresses in practice. This gap is documented in a comment at the top of `DataTable.test.tsx`.

## Hard-rule compliance checklist

The "component is complete" criteria from root `CLAUDE.md`:

1. `DataTable.test.tsx`, `useDataTable.test.ts`, `ColumnVisibilityTrigger.test.tsx` colocated with their source.
2. `DataTableDemo.tsx` added to `packages/playground/src/pages/demo/` showing every feature: columns, ordering, sizing, visibility menu, pinning (col + row), selection, click, expansion, sort, loading, empty.
3. Demo wired into `App.tsx` (route), `AppShell.tsx` (sidebar), `DemoIndex.tsx` (tile).
4. `DataTable`, `useDataTable`, `ColumnVisibilityTrigger` re-exported from `packages/design-system/src/index.ts`.
5. "When NOT to use / anti-patterns" prose in JSDoc `@remarks` blocks for each public component / hook. One-section TL;DR in `packages/design-system/AGENTS.md`.

The phasing above splits these across three PRs — each PR satisfies the hard rules for its slice (its own tests, demo updates, JSDoc, AGENTS.md additions).
