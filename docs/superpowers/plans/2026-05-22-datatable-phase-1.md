# DataTable Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first phase of `<DataTable>` — the `useDataTable` hook, `<DataTable>` component, and `<DataTable.ColumnVisibilityTrigger>` companion — covering column ordering / sizing / visibility, row selection, row click, sticky header, sort interaction, and loading/empty states. **Column pinning rendering and expandable rows are deferred to phases 2 and 3** (state plumbing for those is included here but their rendering effects are not).

**Architecture:** Config-driven column model (`ColumnDef<T>[]`). State managed by `useDataTable` hook with Radix-style controlled/uncontrolled pattern per piece. `<DataTable>` accepts an `instance` from the hook and renders via the existing `<Table>` compound primitive. Drag-to-reorder uses `@dnd-kit/sortable`. Resize handle is hand-rolled with pointer events. Server-driven sort/search/pagination — no client-side data transforms.

**Tech Stack:** React 18 + TypeScript (source-distributed). `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (new deps). Composes existing `<Table>`, `<DropdownMenu>`, `<Checkbox>`, `<EmptyState>`, `<Skeleton>`, `<Button>`. Vitest + RTL for tests. CSS Modules + SCSS tokens.

**Source of truth:** `docs/superpowers/specs/2026-05-22-datatable-design.md` (commit `de95398`). Read it for any requirement not explicit in a task.

**Branch:** `feat/datatable`. Commit per-task. Open a PR at the end of the plan (after the Hard-Rule-8 review-fix cycle passes).

---

## File Structure

```
packages/design-system/src/components/DataTable/
  types.ts                          ← ColumnDef<T>, state types, instance type, options type
  useControllableState.ts           ← local hook: Radix-style controlled-or-default state
  useControllableState.test.ts
  useDataTable.ts                   ← the hook: state machine + derived view models
  useDataTable.test.ts              ← pure-logic unit tests
  useResizeHandle.ts                ← pointer-based resize-handle hook
  useResizeHandle.test.ts
  HeaderCell.tsx                    ← sortable header (label + sort + hover grip + resize handle)
  HeaderCell.module.scss
  BodyRow.tsx                       ← row renderer (selection cell + data cells + row-click)
  DataTable.tsx                     ← <DataTable> component (wires DndContext + renders Table)
  DataTable.module.scss
  DataTable.test.tsx                ← integration tests via RTL
  ColumnVisibilityTrigger.tsx       ← companion: Button → DropdownMenu of CheckboxItems
  ColumnVisibilityTrigger.module.scss
  ColumnVisibilityTrigger.test.tsx
  index.ts                          ← public re-exports

packages/design-system/src/styles/tokens.scss   ← MODIFIED: add any new tokens
packages/design-system/src/index.ts             ← MODIFIED: re-export DataTable surface
packages/design-system/AGENTS.md                ← MODIFIED: add DataTable TL;DR
packages/playground/src/pages/components/DataTableDemo.tsx   ← NEW
packages/playground/src/App.tsx                              ← MODIFIED: route
packages/playground/src/layout/AppShell/AppShell.tsx         ← MODIFIED: nav item
packages/playground/src/pages/components/ComponentsIndex.tsx ← MODIFIED: grid card
```

**Decomposition rationale:**

- `types.ts` is the type-only contract; consumed by every other file. Keeps re-export surface flat.
- `useControllableState` is a tiny local utility (12 lines). Lives next to `useDataTable` rather than `_internal/` because no other component uses it today; promote later if reused.
- `useDataTable` is the heart of the design — pure state machine + memoized derived models. Tested in isolation without DOM.
- `HeaderCell` and `BodyRow` are split out so neither file becomes too large to reason about. Each is a focused responsibility: header = sort/grip/resize; body = selection/click/cells.
- `useResizeHandle` is its own hook + test so the pointer-event logic can be tested without mounting a full table.
- `<DataTable>` is the orchestrator — sets up `DndContext`, renders `<Table>` with `colgroup` + header + body.
- `ColumnVisibilityTrigger` is a standalone companion component; lives in the same folder so it can directly use internal types but exports cleanly.

---

## Task 1 — Install dnd-kit dependencies

**Files:**

- Modify: `packages/design-system/package.json`

- [ ] **Step 1: Verify clean working tree on `feat/datatable`**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
```

Expected: `On branch feat/datatable`, working tree clean (the spec commit `de95398` is already in place).

- [ ] **Step 2: Add dnd-kit deps to the library workspace**

```bash
npm install --workspace @eocrm/design-system \
  @dnd-kit/core@^6.1.0 \
  @dnd-kit/sortable@^8.0.0 \
  @dnd-kit/utilities@^3.2.2
```

Expected: `package.json` updated under `packages/design-system/`. Root `package-lock.json` updated.

- [ ] **Step 3: Verify install + typecheck still passes**

```bash
make build-lib
```

Expected: typecheck passes (no DataTable code yet, so no usage of dnd-kit yet — just verifying nothing broke).

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/package.json package-lock.json
git commit -m "DataTable: add @dnd-kit deps (core, sortable, utilities)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Create folder + types.ts

**Files:**

- Create: `packages/design-system/src/components/DataTable/types.ts`
- Create: `packages/design-system/src/components/DataTable/index.ts` (placeholder, will be populated)

- [ ] **Step 1: Create folder + index placeholder**

```bash
mkdir -p packages/design-system/src/components/DataTable
```

- [ ] **Step 2: Write `types.ts` with the full type contract**

Create `packages/design-system/src/components/DataTable/types.ts`:

```ts
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
```

- [ ] **Step 3: Stub `index.ts`**

Create `packages/design-system/src/components/DataTable/index.ts`:

```ts
export type * from './types';
```

- [ ] **Step 4: Verify typecheck**

```bash
make build-lib
```

Expected: passes. No runtime code yet, just types being exported.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/
git commit -m "DataTable: type-only contract (ColumnDef, state types, instance type)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `useControllableState` hook

A tiny local utility that resolves the Radix `value`/`defaultValue`/`onChange` pattern. Used by `useDataTable` for every state piece.

**Files:**

- Create: `packages/design-system/src/components/DataTable/useControllableState.ts`
- Test: `packages/design-system/src/components/DataTable/useControllableState.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/design-system/src/components/DataTable/useControllableState.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  it('uses defaultValue when uncontrolled', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 5 }));
    expect(result.current[0]).toBe(5);
  });

  it('uses value when controlled (ignores default)', () => {
    const { result } = renderHook(() => useControllableState({ value: 10, defaultValue: 5 }));
    expect(result.current[0]).toBe(10);
  });

  it('updates internal state when uncontrolled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('does NOT update internal state when controlled — only fires onChange', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ v }) => useControllableState({ value: v, onChange }),
      { initialProps: { v: 10 } },
    );
    act(() => result.current[1](99));
    // value prop didn't change, so resolved stays 10
    expect(result.current[0]).toBe(10);
    expect(onChange).toHaveBeenCalledWith(99);

    rerender({ v: 99 });
    expect(result.current[0]).toBe(99);
  });

  it('accepts an updater function', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 5 }));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(6);
  });

  it('updater function receives current value when controlled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ value: 10, onChange }));
    act(() => result.current[1]((prev) => prev + 5));
    expect(onChange).toHaveBeenCalledWith(15);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
make test -- useControllableState.test.ts
```

Expected: fails with `Cannot find module './useControllableState'`.

- [ ] **Step 3: Implement `useControllableState`**

Create `packages/design-system/src/components/DataTable/useControllableState.ts`:

```ts
import { useCallback, useRef, useState } from 'react';
import type { Updater } from './types';

/**
 * Radix-style controlled/uncontrolled state hook.
 *
 * - If `value` is defined → controlled. Resolved value tracks `value`. Setter
 *   does NOT update internal state; only fires `onChange` so the consumer can
 *   update their own state.
 * - If `value` is undefined → uncontrolled. Resolved value comes from internal
 *   state seeded with `defaultValue`. Setter updates internal state AND fires
 *   `onChange`.
 *
 * Switching between controlled and uncontrolled across renders is not supported
 * (matches Radix / React behavior — produces a warning in dev only on first
 * such switch in React, but otherwise no-op).
 */
export function useControllableState<T>(options: {
  value?: T;
  defaultValue?: T;
  onChange?: (next: T) => void;
}): [T, (updater: Updater<T>) => void] {
  const { value, defaultValue, onChange } = options;
  const isControlled = value !== undefined;

  const [internal, setInternal] = useState<T | undefined>(defaultValue);
  const resolved = (isControlled ? value : internal) as T;

  // Keep a ref to the most recent resolved value so updater functions
  // always operate on the latest state even if callers debounce or batch.
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback(
    (updater: Updater<T>) => {
      const prev = resolvedRef.current;
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );

  return [resolved, setValue];
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
make test -- useControllableState.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useControllableState.ts \
        packages/design-system/src/components/DataTable/useControllableState.test.ts
git commit -m "DataTable: useControllableState hook (Radix-style controlled/uncontrolled)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `useDataTable` skeleton + controlled-state resolution

Build the hook in slices. This first slice: state plumbing for every piece, no derived view-models yet, no helper methods yet.

**Files:**

- Create: `packages/design-system/src/components/DataTable/useDataTable.ts`
- Test: `packages/design-system/src/components/DataTable/useDataTable.test.ts`

- [ ] **Step 1: Write the failing tests for skeleton + state resolution**

Create `packages/design-system/src/components/DataTable/useDataTable.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string; name: string; amount: number };

const cols: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount, sortable: true },
];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', amount: 10 },
  { id: 'r2', name: 'Bravo', amount: 20 },
];

const getRowId = (r: Row) => r.id;

describe('useDataTable — state resolution', () => {
  it('echoes data, columns, getRowId', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.data).toBe(rows);
    expect(result.current.columns).toBe(cols);
    expect(result.current.getRowId).toBe(getRowId);
    expect(result.current.pinnedRows).toEqual([]);
  });

  it('defaults enableRowSelection to false and hasExpansion to false', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.enableRowSelection).toBe(false);
    expect(result.current.hasExpansion).toBe(false);
  });

  it('reports hasExpansion=true when renderExpandedRow is provided', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => null,
      }),
    );
    expect(result.current.hasExpansion).toBe(true);
  });

  it('initialises columnOrder from defaultColumnOrder', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnOrder: ['amount', 'name'],
      }),
    );
    expect(result.current.columnOrder).toEqual(['amount', 'name']);
  });

  it('falls back to columns order when no default given', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.columnOrder).toEqual(['name', 'amount']);
  });

  it('controlled columnOrder overrides default', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        columnOrder: ['amount', 'name'],
        onColumnOrderChange: onChange,
      }),
    );
    expect(result.current.columnOrder).toEqual(['amount', 'name']);
    act(() => result.current.setColumnOrder(['name', 'amount']));
    expect(onChange).toHaveBeenCalledWith(['name', 'amount']);
  });

  it('initialises all other state pieces with sensible defaults', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.columnSizing).toEqual({});
    expect(result.current.columnVisibility).toEqual({});
    expect(result.current.columnPinning).toEqual({ left: [], right: [] });
    expect(result.current.rowSelection).toEqual({});
    expect(result.current.expandedRows).toEqual({});
    expect(result.current.sort).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
make test -- useDataTable.test.ts
```

Expected: fails with `Cannot find module './useDataTable'`.

- [ ] **Step 3: Implement skeleton of `useDataTable`**

Create `packages/design-system/src/components/DataTable/useDataTable.ts`:

```ts
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

  // Derived view-models and helper methods land in subsequent tasks.
  // For now, stubs that satisfy the interface; tasks 5–10 will replace them.
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
```

- [ ] **Step 4: Run the test — expect pass**

```bash
make test -- useDataTable.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useDataTable.ts \
        packages/design-system/src/components/DataTable/useDataTable.test.ts
git commit -m "DataTable: useDataTable skeleton + controlled-state resolution

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Derived view-models (visibleColumns, pin grouping, columnSizesPx)

Replace the stubs in `useDataTable` with memoized derivations.

**Files:**

- Modify: `packages/design-system/src/components/DataTable/useDataTable.ts`
- Modify: `packages/design-system/src/components/DataTable/useDataTable.test.ts`

- [ ] **Step 1: Append derived view-model tests**

Append to `packages/design-system/src/components/DataTable/useDataTable.test.ts`:

```ts
describe('useDataTable — derived view-models', () => {
  it('visibleColumns excludes columns where columnVisibility[id] === false', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnVisibility: { amount: false },
      }),
    );
    expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['name']);
  });

  it('visibleColumns honours columnOrder', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnOrder: ['amount', 'name'],
      }),
    );
    expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['amount', 'name']);
  });

  it('columnSizesPx resolves: sizing state > ColumnDef.size > default 120', () => {
    const colsWithSize: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount, size: 80 },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: colsWithSize,
        getRowId,
        defaultColumnSizing: { name: 200 },
      }),
    );
    expect(result.current.columnSizesPx).toEqual({ name: 200, amount: 80 });
  });

  it('groups columns by pinning side', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id },
      { id: 'b', header: 'B', cell: (r) => r.id },
      { id: 'c', header: 'C', cell: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: ['a'], right: ['c'] },
      }),
    );
    expect(result.current.leftPinnedColumns.map((c) => c.id)).toEqual(['a']);
    expect(result.current.rightPinnedColumns.map((c) => c.id)).toEqual(['c']);
    expect(result.current.unpinnedColumns.map((c) => c.id)).toEqual(['b']);
  });

  it('leftPinOffsets accumulates widths in pin order', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id, size: 50 },
      { id: 'b', header: 'B', cell: (r) => r.id, size: 80 },
      { id: 'c', header: 'C', cell: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: ['a', 'b'], right: [] },
      }),
    );
    expect(result.current.leftPinOffsets).toEqual({ a: 0, b: 50 });
  });

  it('rightPinOffsets accumulates widths from the right side inward', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id, size: 50 },
      { id: 'b', header: 'B', cell: (r) => r.id, size: 80 },
      { id: 'c', header: 'C', cell: (r) => r.id, size: 60 },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: [], right: ['b', 'c'] },
      }),
    );
    // right pinning: rightmost column gets right: 0, next inward stacks past it
    expect(result.current.rightPinOffsets).toEqual({ c: 0, b: 60 });
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
make test -- useDataTable.test.ts
```

Expected: the 6 new tests fail (stubs return empty).

- [ ] **Step 3: Replace stubs in `useDataTable.ts` with memoized derivations**

In `packages/design-system/src/components/DataTable/useDataTable.ts`, replace the section starting with `// Derived view-models and helper methods land in subsequent tasks.` through the end of the stubs (just before `const noop = () => {};`) with:

```ts
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
```

Then replace the corresponding stub fields in the returned object:

```ts
    visibleColumns,
    leftPinnedColumns,
    rightPinnedColumns,
    unpinnedColumns,
    columnSizesPx,
    leftPinOffsets,
    rightPinOffsets,
```

(They were already named correctly in the stub — confirm the references now resolve to the new memoized values, and remove the now-unused stub declarations above.)

- [ ] **Step 4: Run — expect pass**

```bash
make test -- useDataTable.test.ts
```

Expected: all tests pass (state + derived view-models).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useDataTable.ts \
        packages/design-system/src/components/DataTable/useDataTable.test.ts
git commit -m "DataTable: derived view-models (visibleColumns, pin grouping, columnSizesPx, pin offsets)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Selection helpers + sort cycling

Replace the helper-method stubs.

**Files:**

- Modify: `packages/design-system/src/components/DataTable/useDataTable.ts`
- Modify: `packages/design-system/src/components/DataTable/useDataTable.test.ts`

- [ ] **Step 1: Append helper tests**

Append to `packages/design-system/src/components/DataTable/useDataTable.test.ts`:

```ts
describe('useDataTable — selection helpers', () => {
  it('toggleRowSelection toggles a single row', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleRowSelection('r1'));
    expect(onChange).toHaveBeenCalledWith({ r1: true });
    act(() => result.current.toggleRowSelection('r1'));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('toggleAllOnPage selects all rows in data (ignoring pinnedRows)', () => {
    const onChange = vi.fn();
    const pinned: Row[] = [{ id: 'p1', name: 'Pin', amount: 1 }];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleAllOnPage());
    expect(onChange).toHaveBeenCalledWith({ r1: true, r2: true });
  });

  it('toggleAllOnPage deselects when all are selected', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        defaultRowSelection: { r1: true, r2: true },
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleAllOnPage());
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('isAllOnPageSelected / isSomeOnPageSelected reflect data only', () => {
    const { result, rerender } = renderHook(
      (sel: { r1?: boolean; r2?: boolean }) =>
        useDataTable({
          data: rows,
          columns: cols,
          getRowId,
          enableRowSelection: true,
          rowSelection: sel,
          onRowSelectionChange: () => {},
        }),
      { initialProps: {} },
    );
    expect(result.current.isAllOnPageSelected()).toBe(false);
    expect(result.current.isSomeOnPageSelected()).toBe(false);

    rerender({ r1: true });
    expect(result.current.isAllOnPageSelected()).toBe(false);
    expect(result.current.isSomeOnPageSelected()).toBe(true);

    rerender({ r1: true, r2: true });
    expect(result.current.isAllOnPageSelected()).toBe(true);
    expect(result.current.isSomeOnPageSelected()).toBe(false); // "some but not all" semantics
  });
});

describe('useDataTable — sort helpers', () => {
  it('toggleSort cycles null → asc → desc → null', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (sort: any) =>
        useDataTable({
          data: rows,
          columns: cols,
          getRowId,
          sort,
          onSortChange: onChange,
        }),
      { initialProps: null as any },
    );
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'asc' });

    rerender({ columnId: 'amount', direction: 'asc' });
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'desc' });

    rerender({ columnId: 'amount', direction: 'desc' });
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('toggleSort on a different column starts asc from scratch', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        sort: { columnId: 'amount', direction: 'desc' },
        onSortChange: onChange,
      }),
    );
    act(() => result.current.toggleSort('name'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });
});

describe('useDataTable — column helpers', () => {
  it('toggleColumnVisibility flips visibility for an id', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        onColumnVisibilityChange: onChange,
      }),
    );
    act(() => result.current.toggleColumnVisibility('amount'));
    expect(onChange).toHaveBeenCalledWith({ amount: false });
    act(() => result.current.toggleColumnVisibility('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ amount: true });
  });

  it('pinColumn moves a column to left, right, or unpins it', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        onColumnPinningChange: onChange,
      }),
    );
    act(() => result.current.pinColumn('name', 'left'));
    expect(onChange).toHaveBeenLastCalledWith({ left: ['name'], right: [] });
    act(() => result.current.pinColumn('amount', 'right'));
    expect(onChange).toHaveBeenLastCalledWith({ left: ['name'], right: ['amount'] });
    act(() => result.current.pinColumn('name', false));
    expect(onChange).toHaveBeenLastCalledWith({ left: [], right: ['amount'] });
  });

  it('toggleRowExpanded flips expansion for a row id', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => null,
        onExpandedRowsChange: onChange,
      }),
    );
    act(() => result.current.toggleRowExpanded('r1'));
    expect(onChange).toHaveBeenCalledWith({ r1: true });
    act(() => result.current.toggleRowExpanded('r1'));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
make test -- useDataTable.test.ts
```

Expected: the new tests fail (helpers are still no-ops).

- [ ] **Step 3: Implement helpers**

In `useDataTable.ts`, replace the helper stubs (the lines from `const noop = () => {};` through the `pinColumn: noop` line in the returned object) with real implementations.

Add these `useCallback` definitions above the `return` statement (after the derived view-models):

```ts
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
```

Also add `useCallback` to the imports at the top of the file:

```ts
import { useCallback, useMemo } from 'react';
```

Update the returned object's helper fields:

```ts
    toggleRowSelection,
    toggleAllOnPage,
    isAllOnPageSelected,
    isSomeOnPageSelected,
    toggleRowExpanded,
    toggleColumnVisibility,
    pinColumn,
    toggleSort,
```

Delete the `const noop = () => {};` line.

- [ ] **Step 4: Run — expect pass**

```bash
make test -- useDataTable.test.ts
```

Expected: all useDataTable tests pass (~20+ total now).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useDataTable.ts \
        packages/design-system/src/components/DataTable/useDataTable.test.ts
git commit -m "DataTable: helper methods (selection, sort cycle, pin, expand, visibility toggle)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — `useResizeHandle` hook

Pointer-based resize handle. Pure hook returning event handlers + drag state.

**Files:**

- Create: `packages/design-system/src/components/DataTable/useResizeHandle.ts`
- Test: `packages/design-system/src/components/DataTable/useResizeHandle.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/design-system/src/components/DataTable/useResizeHandle.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useResizeHandle } from './useResizeHandle';

function pointer(type: string, clientX: number, pointerId = 1): PointerEvent {
  return new PointerEvent(type, { clientX, pointerId, bubbles: true });
}

describe('useResizeHandle', () => {
  it('returns initial isResizing=false', () => {
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize: () => {} }),
    );
    expect(result.current.isResizing).toBe(false);
  });

  it('pointerdown → pointermove → pointerup fires onResize with delta-clamped width', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    // jsdom's setPointerCapture is a no-op; that's fine.
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(pointer('pointermove', 75)); // +25px
    });
    expect(onResize).toHaveBeenCalledWith(125);

    act(() => {
      window.dispatchEvent(pointer('pointerup', 75));
    });
    expect(result.current.isResizing).toBe(false);
  });

  it('clamps width below minWidth', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });

    act(() => {
      window.dispatchEvent(pointer('pointermove', -100)); // -150px would be width=-50
    });
    expect(onResize).toHaveBeenLastCalledWith(40); // clamped to minWidth
  });

  it('clamps to maxWidth when provided', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, maxWidth: 200, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });

    act(() => {
      window.dispatchEvent(pointer('pointermove', 500));
    });
    expect(onResize).toHaveBeenLastCalledWith(200);
  });

  it('pointercancel ends the drag', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(pointer('pointercancel', 60));
    });
    expect(result.current.isResizing).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failure (module missing)**

```bash
make test -- useResizeHandle.test.ts
```

- [ ] **Step 3: Implement the hook**

Create `packages/design-system/src/components/DataTable/useResizeHandle.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface UseResizeHandleOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth?: number;
  onResize: (nextWidth: number) => void;
}

interface ResizeHandleApi {
  isResizing: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Pointer-based resize-handle hook. Attach `onPointerDown` to the handle
 * element. While dragging, `pointermove` on window fires `onResize` with
 * the clamped width; `pointerup` / `pointercancel` ends the drag.
 *
 * `initialWidth` is captured at pointerdown — callers don't need to keep
 * it in sync between events (the hook holds the start width internally).
 */
export function useResizeHandle(options: UseResizeHandleOptions): ResizeHandleApi {
  const { minWidth, maxWidth, onResize } = options;
  const [isResizing, setIsResizing] = useState(false);

  // Held in refs so handlers attached to window don't go stale.
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const minRef = useRef(minWidth);
  minRef.current = minWidth;
  const maxRef = useRef(maxWidth);
  maxRef.current = maxWidth;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWidthRef.current = options.initialWidth;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // No-op for older browsers / jsdom.
      }
      setIsResizing(true);
    },
    [options.initialWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    function clamp(n: number) {
      const min = minRef.current;
      const max = maxRef.current;
      let v = Math.max(min, n);
      if (max != null) v = Math.min(max, v);
      return v;
    }

    function onMove(e: PointerEvent) {
      const delta = e.clientX - startXRef.current;
      const next = clamp(startWidthRef.current + delta);
      onResizeRef.current(next);
    }
    function onEnd() {
      setIsResizing(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isResizing]);

  return { isResizing, onPointerDown };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
make test -- useResizeHandle.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useResizeHandle.ts \
        packages/design-system/src/components/DataTable/useResizeHandle.test.ts
git commit -m "DataTable: useResizeHandle hook (pointer-based, clamped)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — `HeaderCell` component

The sortable header cell. Renders the label, sort indicator, hover-revealed drag grip (with `useSortable` from dnd-kit), and resize handle.

**Files:**

- Create: `packages/design-system/src/components/DataTable/HeaderCell.tsx`
- Create: `packages/design-system/src/components/DataTable/HeaderCell.module.scss`

This file is rendering-only — the behavior it composes is tested at the `DataTable.test.tsx` integration level (Task 12). No separate unit test for `HeaderCell.tsx`.

- [ ] **Step 1: Write the SCSS module**

Create `packages/design-system/src/components/DataTable/HeaderCell.module.scss`:

```scss
.headerCell {
  position: relative;
  // Layout for inner content — using `:global` to avoid leaking
  // any layout property out of this scope per Rule 4.
}

.inner {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  height: 100%;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex: 1 1 auto;
  min-width: 0;
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-default);
  cursor: default;
  user-select: none;

  &.sortable {
    cursor: pointer;
  }

  &.sortable:focus-visible {
    outline: var(--focus-ring);
    outline-offset: -2px;
    border-radius: var(--radius-sm);
  }
}

.grip {
  display: inline-flex;
  align-items: center;
  color: var(--color-fg-muted);
  opacity: 0;
  cursor: grab;
  padding: 0 var(--space-05);
  transition: opacity 0.1s ease;

  // Reveal on header hover OR when grip itself is focused.
  .headerCell:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:focus-visible {
    outline: var(--focus-ring);
    outline-offset: -2px;
    border-radius: var(--radius-sm);
  }
}

.resizeHandle {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  user-select: none;
}

.resizeBar {
  width: 1px;
  height: 60%;
  background: transparent;
  transition:
    background 0.1s ease,
    width 0.1s ease;
}

.resizeHandle:hover .resizeBar,
.resizeBar.active {
  background: var(--color-accent);
  width: 2px;
}

.dragging {
  opacity: 0.4;
}
```

Note on tokens used: `--color-fg-default`, `--color-fg-muted`, `--color-accent`, `--space-05`, `--space-1`, `--space-2`, `--font-weight-semibold`, `--radius-sm`, `--focus-ring`. **If any of these don't exist** in `src/styles/tokens.scss`, add them in the smallest possible way before committing this file — they're standard.

- [ ] **Step 2: Write the component**

Create `packages/design-system/src/components/DataTable/HeaderCell.tsx`:

```tsx
import { forwardRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table } from '../Table';
import type { TableSortDirection } from '../Table';
import { useResizeHandle } from './useResizeHandle';
import type { ColumnDef, DataTableInstance } from './types';
import styles from './HeaderCell.module.scss';

export interface HeaderCellProps<T> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

/**
 * Sortable header cell with a hover-revealed drag grip and a resize handle.
 *
 * - **Label area** is the sort click-target when `column.sortable === true`.
 * - **Grip** appears on hover or keyboard focus; it's the drag handle wired
 *   to `@dnd-kit/sortable`'s `useSortable`. The grip is the ONLY draggable
 *   target — listeners are not attached to the cell or label, so clicking
 *   the label never starts a drag.
 * - **Resize handle** is a 6px hit-zone on the right edge. Disabled when
 *   `column.enableResize === false`.
 */
export function HeaderCell<T>({ column, instance }: HeaderCellProps<T>) {
  const sortable = column.sortable === true;
  const sortDir: TableSortDirection | undefined =
    instance.sort?.columnId === column.id ? instance.sort.direction : sortable ? 'none' : undefined;

  // dnd-kit sortable — column is its own sortable item.
  const reorderable = column.enableReorder !== false;
  const sortableResult = useSortable({ id: column.id, disabled: !reorderable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableResult;

  const width = instance.columnSizesPx[column.id] ?? 120;
  const resize = useResizeHandle({
    initialWidth: width,
    minWidth: column.minSize ?? 40,
    maxWidth: column.maxSize,
    onResize: (next) => {
      instance.setColumnSizing((prev) => ({ ...prev, [column.id]: next }));
    },
  });

  const onLabelKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    // Sort cycle on Enter / Space (when sortable)
    if (sortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      instance.toggleSort(column.id);
      return;
    }
    // Keyboard resize: ← / → for ±8px; Shift+← / Shift+→ for ±32px.
    if (column.enableResize === false) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = (e.shiftKey ? 32 : 8) * (e.key === 'ArrowRight' ? 1 : -1);
      const current = instance.columnSizesPx[column.id] ?? 120;
      const minW = column.minSize ?? 40;
      const maxW = column.maxSize;
      let next = current + step;
      if (next < minW) next = minW;
      if (maxW != null && next > maxW) next = maxW;
      instance.setColumnSizing((prev) => ({ ...prev, [column.id]: next }));
    }
  };

  const headerContent =
    typeof column.header === 'function' ? column.header({ column, instance }) : column.header;

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  return (
    <Table.HeaderCell
      align={column.align ?? 'start'}
      sortDirection={sortDir}
      onClick={sortable ? () => instance.toggleSort(column.id) : undefined}
      className={clsx(styles.headerCell, isDragging && styles.dragging)}
      ref={setNodeRef as any}
      style={dragStyle}
    >
      <div className={styles.inner}>
        {reorderable && (
          <span
            className={styles.grip}
            ref={(el) => {
              // dnd-kit's listeners are spread on the grip
            }}
            // Spread BOTH attributes (aria/role) and listeners (pointerdown etc.)
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${typeof column.header === 'string' ? column.header : column.id}`}
            // tabIndex so keyboard users can focus to reveal grip + activate drag
            tabIndex={0}
          >
            <GripVertical size={14} aria-hidden="true" />
          </span>
        )}
        <span
          className={clsx(styles.label, sortable && styles.sortable)}
          tabIndex={sortable ? 0 : undefined}
          role={sortable ? 'button' : undefined}
          onKeyDown={onLabelKeyDown}
        >
          {headerContent}
        </span>
        {column.enableResize !== false && (
          <span
            className={styles.resizeHandle}
            onPointerDown={resize.onPointerDown}
            // Stop sort click when interacting with resize.
            onClick={(e) => e.stopPropagation()}
            aria-hidden="true"
          >
            <span className={clsx(styles.resizeBar, resize.isResizing && styles.active)} />
          </span>
        )}
      </div>
    </Table.HeaderCell>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
make build-lib
```

Expected: passes. No tests run yet — this file is exercised by `DataTable.test.tsx` in Task 12.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DataTable/HeaderCell.tsx \
        packages/design-system/src/components/DataTable/HeaderCell.module.scss
git commit -m "DataTable: HeaderCell (sort label + hover grip + resize handle)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — `BodyRow` component

Row renderer with the optional selection auto-cell, data cells, and row-click handler.

**Files:**

- Create: `packages/design-system/src/components/DataTable/BodyRow.tsx`

`BodyRow.tsx` uses styles from `DataTable.module.scss` (created in Task 11). For now it imports from a module that will exist.

- [ ] **Step 1: Write the component**

Create `packages/design-system/src/components/DataTable/BodyRow.tsx`:

```tsx
import { type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import type { DataTableInstance } from './types';
import styles from './DataTable.module.scss';

export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
}

/**
 * One row of the body. Handles:
 *  - selection auto-cell (when `instance.enableRowSelection`)
 *  - row click (when `instance.onRowClick`) — ignored if the click target
 *    was an interactive child (button, input, a) so checkbox/button clicks
 *    don't bubble into a navigation.
 *  - data cells from `instance.visibleColumns` (pinning rendering is in
 *    Phase 2 — this phase renders unpinned order only).
 */
export function BodyRow<T>({ row, instance }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    // Ignore clicks that originated on an interactive child.
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) {
      return;
    }
    instance.onRowClick(row, e);
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    // Ignore Enter coming from an interactive child (it should drive that child).
    if (
      target !== e.currentTarget &&
      target.closest('button, input, a, [role="button"], [role="checkbox"]')
    ) {
      return;
    }
    e.preventDefault();
    instance.onRowClick(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };

  return (
    <Table.Row
      selected={selected || undefined}
      onClick={instance.onRowClick ? onRowClick : undefined}
      onKeyDown={instance.onRowClick ? onRowKeyDown : undefined}
      tabIndex={instance.onRowClick ? 0 : undefined}
      className={clsx(instance.onRowClick && styles.clickableRow)}
    >
      {instance.enableRowSelection && (
        <Table.Cell className={styles.autoCell} align="center">
          <Checkbox
            checked={selected}
            onChange={() => instance.toggleRowSelection(rowId)}
            aria-label={`Select row ${rowId}`}
          />
        </Table.Cell>
      )}
      {instance.visibleColumns.map((col) => (
        <Table.Cell key={col.id} align={col.align ?? 'start'}>
          {col.cell(row, { row, rowId, column: col, instance })}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}
```

- [ ] **Step 2: Verify typecheck (will fail until Task 11 creates DataTable.module.scss; we'll proceed and let it pass after Task 11)**

For now, skip the build verification — `DataTable.module.scss` doesn't exist yet. Continue to Task 10.

- [ ] **Step 3: Commit (deferred — bundle with Task 11)**

Do not commit until `DataTable.module.scss` is in place. Stage this file but commit at the end of Task 11.

---

## Task 10 — `DataTable` component test scaffolding

Write the integration test file first (TDD), focusing on the rendering paths that exist in Phase 1.

**Files:**

- Create: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

- [ ] **Step 1: Write the failing test file**

Create `packages/design-system/src/components/DataTable/DataTable.test.tsx`:

```tsx
/**
 * Integration tests for <DataTable> (Phase 1).
 *
 * NOTE on drag-and-drop coverage: column reorder via @dnd-kit's PointerSensor
 * is genuinely hard to test in jsdom. The playground demo serves as the smoke
 * test for reorder. A future Playwright e2e test is the recommended remedy
 * if reorder regresses in practice.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { DataTable } from './DataTable';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string; name: string; amount: number };

const cols: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount },
];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', amount: 10 },
  { id: 'r2', name: 'Bravo', amount: 20 },
];

const getRowId = (r: Row) => r.id;

function Harness(props: Partial<Parameters<typeof useDataTable<Row>>[0]>) {
  const instance = useDataTable<Row>({
    data: rows,
    columns: cols,
    getRowId,
    ...props,
  });
  return <DataTable instance={instance} aria-label="Test" />;
}

describe('<DataTable>', () => {
  it('renders header + body rows', () => {
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('respects aria-label on the table', () => {
    render(<Harness />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Test');
  });

  it('sortable column header click cycles sort and fires onSortChange', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSortChange={onSortChange} />);
    await user.click(screen.getByRole('columnheader', { name: /name/i }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });

  it('renders an empty state when data is empty', () => {
    render(<Harness data={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders a custom emptyState when provided', () => {
    function CustomHarness() {
      const instance = useDataTable<Row>({ data: [], columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" emptyState={<div>NOTHING HERE</div>} />;
    }
    render(<CustomHarness />);
    expect(screen.getByText('NOTHING HERE')).toBeInTheDocument();
  });

  it('renders skeleton rows when loading', () => {
    function LoadingHarness() {
      const instance = useDataTable<Row>({ data: [], columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" loading loadingRowCount={3} />;
    }
    const { container } = render(<LoadingHarness />);
    // Skeleton renders a span with role="status" or a known className from the Skeleton component.
    // We check by tbody row count instead — most robust.
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(3);
  });

  it('renders selection auto-column when enableRowSelection is true', () => {
    render(<Harness enableRowSelection />);
    const headerRow = screen.getAllByRole('row')[0]!;
    // Select-all + 2 data column headers = 3 cells
    expect(within(headerRow).getAllByRole('columnheader').length).toBe(2);
    expect(within(headerRow).getAllByRole('checkbox').length).toBe(1);
  });

  it('toggleRowSelection toggles a row via per-row checkbox', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness enableRowSelection onRowSelectionChange={onChange} defaultRowSelection={{}} />);
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    expect(rowCheckboxes).toHaveLength(2);
    await user.click(rowCheckboxes[0]!);
    expect(onChange).toHaveBeenCalledWith({ r1: true });
  });

  it('header select-all checkbox toggles all rows on page', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness enableRowSelection onRowSelectionChange={onChange} defaultRowSelection={{}} />);
    const headerCheckbox = screen.getAllByRole('checkbox')[0]!;
    await user.click(headerCheckbox);
    expect(onChange).toHaveBeenCalledWith({ r1: true, r2: true });
  });

  it('row click fires onRowClick when target is not interactive', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRowClick={onRowClick} />);
    await user.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]![0]).toEqual(rows[0]);
  });

  it('row Enter keypress fires onRowClick when onRowClick is provided', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRowClick={onRowClick} />);
    const firstRow = screen.getAllByRole('row')[1]!; // [0] is the header row
    firstRow.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('rows are NOT focusable when onRowClick is not provided', () => {
    render(<Harness />);
    const firstBodyRow = screen.getAllByRole('row')[1]!;
    expect(firstBodyRow).not.toHaveAttribute('tabindex');
  });

  it('row click does NOT fire onRowClick when target is the selection checkbox', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        enableRowSelection
        onRowClick={onRowClick}
        defaultRowSelection={{}}
        onRowSelectionChange={() => {}}
      />,
    );
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    await user.click(rowCheckboxes[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('hidden columns do not render cells', () => {
    render(<Harness defaultColumnVisibility={{ amount: false }} />);
    expect(screen.queryByText('10')).toBeNull();
    expect(screen.queryByText('20')).toBeNull();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('respects columnOrder ordering in header + body', () => {
    render(<Harness defaultColumnOrder={['amount', 'name']} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]!.textContent).toMatch(/amount/i);
    expect(headers[1]!.textContent).toMatch(/name/i);
  });

  it('forwards ref to the underlying <table>', () => {
    function RefHarness() {
      const ref = useRef<HTMLTableElement>(null);
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} ref={ref} aria-label="t" data-testid="dt" />;
    }
    const { container } = render(<RefHarness />);
    expect(container.querySelector('table')).toBeInstanceOf(HTMLTableElement);
  });

  it('merges className with the underlying <table>', () => {
    function ClassHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} className="my-class" aria-label="t" />;
    }
    const { container } = render(<ClassHarness />);
    expect(container.querySelector('table.my-class')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure (`DataTable` module missing)**

```bash
make test -- DataTable.test.tsx
```

Expected: fails — DataTable not implemented yet.

(The implementation comes in Task 11; this task only stages the test file. Do not commit until Task 11.)

---

## Task 11 — `DataTable` component + SCSS

Implement the orchestrator component and its styles. This is the largest single task in the plan.

**Files:**

- Create: `packages/design-system/src/components/DataTable/DataTable.tsx`
- Create: `packages/design-system/src/components/DataTable/DataTable.module.scss`

- [ ] **Step 1: Write the SCSS module**

Create `packages/design-system/src/components/DataTable/DataTable.module.scss`:

```scss
// Visual / behavior modifiers ONLY. No layout (Rule 4).

.root {
  // composes the Table primitive's scroll wrapper — nothing to add here yet
}

// Selection auto-column — fixed narrow width is set via inline <col width> in colgroup.
.autoCell {
  // text-align center is set by <Table.Cell align="center" />
}

.clickableRow {
  cursor: pointer;
}

// Empty state row — single colspan cell with centered content.
.emptyCell {
  text-align: center;
  padding: var(--space-6) var(--space-4);
  color: var(--color-fg-muted);
}

// Skeleton row cells — just give some visual breathing room.
.skeletonCell {
  // padding inherits from Table.Cell
}
```

- [ ] **Step 2: Write the component**

Create `packages/design-system/src/components/DataTable/DataTable.tsx`:

```tsx
import { forwardRef, useMemo, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
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
import { ColumnVisibilityTrigger } from './ColumnVisibilityTrigger';
import type { DataTableInstance } from './types';
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
  className?: string;
}

const AUTO_CELL_WIDTH = 44;

/**
 * Tabular data component built on the `<Table>` primitive. Owns the column-axis
 * state machine (order / sizing / visibility / pinning) and row-axis state
 * (selection, expansion). Sort/search/pagination are server-driven — DataTable
 * fires `onSortChange` and exposes selection state for the consumer to act on.
 *
 * Accepts a `DataTableInstance<T>` from `useDataTable` (the only state-owning
 * surface). Pass companion components like `<DataTable.ColumnVisibilityTrigger>`
 * the same `instance`.
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
 *       <DataTable.ColumnVisibilityTrigger instance={instance} />
 *       <DataTable instance={instance} aria-label="Deals" />
 *     </>
 *   );
 * }
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
    className,
    ...rest
  }: DataTableProps<T>,
  ref: Ref<HTMLTableElement>,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleIds = useMemo(
    () => instance.visibleColumns.map((c) => c.id),
    [instance.visibleColumns],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    instance.setColumnOrder((prev) => {
      // Map dnd-kit's visible-list-result back into the full columnOrder array
      // by replacing visible-column slots one-by-one in their absolute positions.
      const visible = prev.filter((id) => visibleIds.includes(id));
      const fromIdx = visible.indexOf(activeId);
      const toIdx = visible.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const reorderedVisible = [...visible];
      const [moved] = reorderedVisible.splice(fromIdx, 1);
      reorderedVisible.splice(toIdx, 0, moved!);

      // Splice reorderedVisible back into prev at the same absolute positions.
      let cursor = 0;
      return prev.map((id) => {
        if (visibleIds.includes(id)) {
          return reorderedVisible[cursor++]!;
        }
        return id;
      });
    });
  };

  const totalColCount = instance.visibleColumns.length + (instance.enableRowSelection ? 1 : 0);
  const dataIsEmpty = !loading && instance.data.length === 0 && instance.pinnedRows.length === 0;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleIds} strategy={horizontalListSortingStrategy}>
        <Table
          ref={ref}
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
            {instance.visibleColumns.map((col) => (
              <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
            ))}
          </colgroup>

          <Table.Header>
            <Table.Row>
              {instance.enableRowSelection && (
                <Table.HeaderCell align="center" className={styles.autoCell}>
                  <Checkbox
                    checked={instance.isAllOnPageSelected()}
                    indeterminate={instance.isSomeOnPageSelected()}
                    onChange={() => instance.toggleAllOnPage()}
                    aria-label="Select all rows on page"
                  />
                </Table.HeaderCell>
              )}
              {instance.visibleColumns.map((col) => (
                <HeaderCell key={col.id} column={col} instance={instance} />
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {loading ? (
              <SkeletonRows count={loadingRowCount} totalColCount={totalColCount} />
            ) : dataIsEmpty ? (
              <EmptyRow totalColCount={totalColCount} content={emptyState} />
            ) : (
              instance.data.map((row) => (
                <BodyRow key={instance.getRowId(row)} row={row} instance={instance} />
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
            <Table.Cell key={j}>
              <Skeleton variant="text" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

function EmptyRow({ totalColCount, content }: { totalColCount: number; content?: ReactNode }) {
  return (
    <Table.Row>
      <Table.Cell colSpan={totalColCount} className={styles.emptyCell}>
        {content ?? <EmptyState title="No data" />}
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

// Attach companion components like Radix-style compound APIs.
(DataTable as any).ColumnVisibilityTrigger = ColumnVisibilityTrigger;

// Re-export the companion as a named member of the union below for type purposes.
// (Consumers can also import ColumnVisibilityTrigger directly from the package root.)
```

- [ ] **Step 3: Run the integration tests — expect mostly-passing**

```bash
make test -- DataTable.test.tsx
```

Expected: all tests in `DataTable.test.tsx` pass (~15 tests). Some specific tests may need tweaks:

- If `aria-rowcount` doesn't appear when `rowCount` is undefined, that's fine (the spec uses `?` on the prop).
- If `<Skeleton variant="text">` doesn't render with a `role`, the tbody-row-count check is the right shape.

Fix any test failures by adjusting the component (preferred) or the test (only when the test asserts something the spec doesn't require).

- [ ] **Step 4: Commit DataTable + BodyRow + SCSS together**

```bash
git add packages/design-system/src/components/DataTable/DataTable.tsx \
        packages/design-system/src/components/DataTable/DataTable.module.scss \
        packages/design-system/src/components/DataTable/DataTable.test.tsx \
        packages/design-system/src/components/DataTable/BodyRow.tsx
git commit -m "DataTable: component + BodyRow + integration tests

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — `ColumnVisibilityTrigger` companion

**Files:**

- Create: `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.tsx`
- Create: `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.module.scss`
- Test: `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnVisibilityTrigger } from './ColumnVisibilityTrigger';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string };

const cols: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', cell: (r) => r.id },
  { id: 'b', header: 'B', cell: (r) => r.id },
  { id: 'c', header: 'C', cell: (r) => r.id, enableHide: false }, // always visible — not in menu
];

function Harness(props: { onChange?: (v: any) => void; visibility?: Record<string, boolean> }) {
  const instance = useDataTable<Row>({
    data: [],
    columns: cols,
    getRowId: (r) => r.id,
    columnVisibility: props.visibility ?? {},
    onColumnVisibilityChange: props.onChange,
  });
  return <ColumnVisibilityTrigger instance={instance} />;
}

describe('<ColumnVisibilityTrigger>', () => {
  it('renders one menu item per hidable column', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'B' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox', { name: 'C' })).toBeNull();
  });

  it('toggle fires onColumnVisibilityChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'A' }));
    expect(onChange).toHaveBeenCalledWith({ a: false });
  });

  it('disables the toggle for the last visible hidable column', async () => {
    const user = userEvent.setup();
    // a is the only visible hidable column (b is hidden, c is non-hidable).
    render(<Harness visibility={{ b: false }} />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    const aItem = screen.getByRole('menuitemcheckbox', { name: 'A' });
    expect(aItem).toHaveAttribute('aria-disabled', 'true');
    // b is hidden but still toggleable to show.
    const bItem = screen.getByRole('menuitemcheckbox', { name: 'B' });
    expect(bItem).not.toHaveAttribute('aria-disabled', 'true');
  });
});
```

- [ ] **Step 2: Run — expect failure (module missing)**

```bash
make test -- ColumnVisibilityTrigger.test.tsx
```

- [ ] **Step 3: Write the SCSS module**

Create `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.module.scss`:

```scss
.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
```

- [ ] **Step 4: Write the component**

Create `packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Columns3 } from 'lucide-react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import type { DropdownMenuAlign, DropdownMenuSide } from '../DropdownMenu';
import type { DataTableInstance } from './types';

export interface ColumnVisibilityTriggerProps<T = unknown> {
  instance: DataTableInstance<T>;
  /** Trigger button label. Defaults to "Columns". */
  label?: ReactNode;
  /** Trigger icon. Defaults to a `Columns3` lucide icon. */
  icon?: ReactNode;
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
}

/**
 * Built-in companion for `<DataTable>`. Renders a Button trigger + DropdownMenu
 * of CheckboxItems — one per column where `enableHide !== false`.
 *
 * Guards against hiding the last visible hidable column: when only one
 * hidable column is currently visible, its menu item renders as disabled.
 *
 * @example
 * const instance = useDataTable<Row>({ ... });
 * <Cluster>
 *   <ColumnVisibilityTrigger instance={instance} />
 * </Cluster>
 * <DataTable instance={instance} />
 *
 * @remarks When NOT to use
 * - When the consumer wants a different visibility UI (e.g. a settings drawer).
 *   Build it directly against `instance.columns`, `instance.columnVisibility`,
 *   and `instance.toggleColumnVisibility`.
 */
export function ColumnVisibilityTrigger<T>({
  instance,
  label = 'Columns',
  icon = <Columns3 size={14} aria-hidden="true" />,
  side,
  align,
}: ColumnVisibilityTriggerProps<T>) {
  const hidableCols = instance.columns.filter((c) => c.enableHide !== false);
  const visibleHidableCount = hidableCols.reduce(
    (n, c) => n + (instance.columnVisibility[c.id] === false ? 0 : 1),
    0,
  );

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm">
          {icon}
          {label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side={side} align={align}>
        {hidableCols.map((col) => {
          const visible = instance.columnVisibility[col.id] !== false;
          const isLastVisible = visible && visibleHidableCount === 1;
          const itemLabel =
            col.visibilityLabel ?? (typeof col.header === 'string' ? col.header : col.id);
          return (
            <DropdownMenu.CheckboxItem
              key={col.id}
              checked={visible}
              disabled={isLastVisible}
              onCheckedChange={() => instance.toggleColumnVisibility(col.id)}
            >
              {itemLabel}
            </DropdownMenu.CheckboxItem>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: Run — expect pass**

```bash
make test -- ColumnVisibilityTrigger.test.tsx
```

Expected: all 3 tests pass.

If the test for `aria-disabled` fails because the project's `DropdownMenu.CheckboxItem` doesn't surface that attribute when `disabled`, fix the test to query by another marker (e.g. `data-disabled`) — match what the project's existing menu items produce. Verify by inspecting one of the existing demo tests for `DropdownMenu`.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.tsx \
        packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.module.scss \
        packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.test.tsx
git commit -m "DataTable: ColumnVisibilityTrigger companion + last-visible guard

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — Public exports + library `index.ts`

**Files:**

- Modify: `packages/design-system/src/components/DataTable/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Update the DataTable folder's `index.ts`**

Replace the contents of `packages/design-system/src/components/DataTable/index.ts`:

```ts
export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

export { useDataTable } from './useDataTable';
export { ColumnVisibilityTrigger } from './ColumnVisibilityTrigger';
export type { ColumnVisibilityTriggerProps } from './ColumnVisibilityTrigger';

export type {
  ColumnDef,
  ColumnAlign,
  ColumnOrderState,
  ColumnSizingState,
  ColumnVisibilityState,
  ColumnPinningState,
  RowSelectionState,
  ExpandedRowsState,
  SortState,
  Updater,
  HeaderContext,
  CellContext,
  UseDataTableOptions,
  DataTableInstance,
} from './types';
```

- [ ] **Step 2: Re-export from library root**

Append to `packages/design-system/src/index.ts` (right after the existing `export { CursorPagination }` block):

```ts
export { DataTable, useDataTable, ColumnVisibilityTrigger } from './components/DataTable';
export type {
  DataTableProps,
  ColumnVisibilityTriggerProps,
  DataTableInstance,
  UseDataTableOptions,
  ColumnDef,
  ColumnAlign,
  ColumnOrderState,
  ColumnSizingState,
  ColumnVisibilityState,
  ColumnPinningState,
  RowSelectionState,
  ExpandedRowsState,
  SortState,
  HeaderContext,
  CellContext,
} from './components/DataTable';
```

- [ ] **Step 3: Verify build + tests**

```bash
make build-lib && make test
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DataTable/index.ts \
        packages/design-system/src/index.ts
git commit -m "DataTable: public exports (DataTable, useDataTable, ColumnVisibilityTrigger + types)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — Playground demo

**Files:**

- Create: `packages/playground/src/pages/components/DataTableDemo.tsx`

- [ ] **Step 1: Write the demo**

Create `packages/playground/src/pages/components/DataTableDemo.tsx`:

```tsx
import { useState } from 'react';
import {
  Badge,
  Cluster,
  DataTable,
  Stack,
  useDataTable,
  type ColumnDef,
  type SortState,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DataTable/DataTable.tsx?raw';
import scssSource from '@lib-source/components/DataTable/DataTable.module.scss?raw';

type Deal = {
  id: string;
  name: string;
  stage: 'Lead' | 'Negotiation' | 'Won' | 'Lost';
  amount: number;
  owner: string;
};

const deals: Deal[] = [
  { id: 'd1', name: 'Acme renewal', stage: 'Negotiation', amount: 12000, owner: 'Sara' },
  { id: 'd2', name: 'Globex expansion', stage: 'Lead', amount: 4500, owner: 'Marcus' },
  { id: 'd3', name: 'Initech onboarding', stage: 'Won', amount: 8800, owner: 'Sara' },
  { id: 'd4', name: 'Hooli pilot', stage: 'Lost', amount: 0, owner: 'Jin' },
];

const dealColumns: ColumnDef<Deal>[] = [
  { id: 'name', header: 'Deal', cell: (r) => r.name, sortable: true, size: 200 },
  {
    id: 'stage',
    header: 'Stage',
    cell: (r) => <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>,
    size: 140,
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: (r) => `$${r.amount.toLocaleString()}`,
    align: 'end',
    sortable: true,
    size: 120,
  },
  { id: 'owner', header: 'Owner', cell: (r) => r.owner, size: 120 },
];

function stageTone(stage: Deal['stage']) {
  switch (stage) {
    case 'Won':
      return 'success' as const;
    case 'Lost':
      return 'danger' as const;
    case 'Negotiation':
      return 'warning' as const;
    default:
      return 'info' as const;
  }
}

export function DataTableDemo() {
  return (
    <DemoLayout
      name="DataTable"
      componentName="DataTable"
      description="Composition over the Table primitive with column ordering / sizing / visibility, row selection, row click, sortable headers, and loading/empty states. Phase 1 — column pinning and expandable rows ship in later phases."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DataTable.tsx"
      scssFilename="DataTable.module.scss"
    >
      <BasicExample />
      <SortableExample />
      <SelectableExample />
      <VisibilityExample />
      <LoadingExample />
      <EmptyExample />
    </DemoLayout>
  );
}

function BasicExample() {
  return (
    <Example
      title="Basic"
      description="Default DataTable with sticky header, hover rows, and resizable + reorderable columns. Click any header label to sort. Hover over a header to reveal the drag grip."
      code={`const instance = useDataTable<Deal>({ data, columns, getRowId: (r) => r.id });
return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <BasicTable />
    </Example>
  );
}

function BasicTable() {
  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return <DataTable instance={instance} aria-label="Deals (basic)" />;
}

function SortableExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = sort
    ? [...deals].sort((a, b) => {
        const va = (a as any)[sort.columnId];
        const vb = (b as any)[sort.columnId];
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.direction === 'asc' ? cmp : -cmp;
      })
    : deals;

  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Server-driven sort (simulated)"
      description="The demo sorts on the client for illustration, but in real code your onSortChange callback would refetch from the server with the new sort. DataTable does not transform data — it only manages and emits sort state."
      code={`const [sort, setSort] = useState<SortState | null>(null);
const instance = useDataTable({ data, columns, getRowId, sort, onSortChange: setSort });`}
    >
      <DataTable instance={instance} aria-label="Deals (sortable)" />
    </Example>
  );
}

function SelectableExample() {
  const [selection, setSelection] = useState({});
  const selectedCount = Object.keys(selection).length;

  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    rowSelection: selection,
    onRowSelectionChange: setSelection,
    onRowClick: (row) => alert(`Row clicked: ${row.name}`),
  });

  return (
    <Example
      title="Selection + row click"
      description="enableRowSelection adds a checkbox column. The header checkbox toggles all rows on the current page (indeterminate when partially selected). Clicking elsewhere on a row fires onRowClick — but clicking the checkbox does not."
      code={`const [selection, setSelection] = useState({});
const instance = useDataTable({
  data, columns, getRowId,
  enableRowSelection: true,
  rowSelection: selection,
  onRowSelectionChange: setSelection,
  onRowClick: (row) => navigate(\`/deals/\${row.id}\`),
});`}
    >
      <Stack gap="sm">
        <Cluster gap="sm">
          <span>{selectedCount} selected</span>
        </Cluster>
        <DataTable instance={instance} aria-label="Deals (selectable)" />
      </Stack>
    </Example>
  );
}

function VisibilityExample() {
  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    defaultColumnVisibility: { owner: false },
  });

  return (
    <Example
      title="Column visibility"
      description="ColumnVisibilityTrigger renders a Button → DropdownMenu of CheckboxItems for every column where enableHide is not false. The last visible hidable column is disabled — DataTable always shows at least one data column."
      code={`<Cluster><DataTable.ColumnVisibilityTrigger instance={instance} /></Cluster>
<DataTable instance={instance} />`}
    >
      <Stack gap="sm">
        <Cluster gap="sm">
          <DataTable.ColumnVisibilityTrigger instance={instance} />
        </Cluster>
        <DataTable instance={instance} aria-label="Deals (visibility)" />
      </Stack>
    </Example>
  );
}

function LoadingExample() {
  const instance = useDataTable<Deal>({
    data: [],
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return (
    <Example
      title="Loading"
      description="Pass loading to render skeleton rows. loadingRowCount controls how many (default 10)."
      code={`<DataTable instance={instance} loading loadingRowCount={4} />`}
    >
      <DataTable instance={instance} loading loadingRowCount={4} aria-label="Loading" />
    </Example>
  );
}

function EmptyExample() {
  const instance = useDataTable<Deal>({
    data: [],
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return (
    <Example
      title="Empty"
      description="When data is empty (and not loading), DataTable shows a default EmptyState. Pass emptyState for a custom one."
      code={`<DataTable instance={instance} aria-label="Deals" />`}
    >
      <DataTable instance={instance} aria-label="Deals (empty)" />
    </Example>
  );
}
```

If `Badge` doesn't expose the exact tones used (`success`, `danger`, `warning`, `info`), inspect `Badge`'s types via `grep -rn "BadgeTone" packages/design-system/src` and use the available ones. Don't invent new tones.

- [ ] **Step 2: Verify the demo builds**

```bash
make build-lib  # smoke-tests both packages
```

If the build fails on a missing Badge tone or a Cluster prop, fix the demo's usage to match available exports (don't change the library).

- [ ] **Step 3: Commit (will wire into nav in next task)**

```bash
git add packages/playground/src/pages/components/DataTableDemo.tsx
git commit -m "playground: DataTableDemo (basic / sortable / selectable / visibility / loading / empty)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — Wire demo into navigation (4 places)

Per playground `CLAUDE.md` Hard Rule 4.

**Files:**

- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts` (only if any mockup uses DataTable)

- [ ] **Step 1: Add the route in `App.tsx`**

In `packages/playground/src/App.tsx`:

1. Add the import alongside the others:

```ts
import { DataTableDemo } from './pages/components/DataTableDemo';
```

2. Add the route inside `<Routes>` (alphabetical with siblings is fine):

```tsx
<Route path="/components/datatable" element={<DataTableDemo />} />
```

- [ ] **Step 2: Add the sidebar item in `AppShell.tsx`**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Find the `componentGroups` array. DataTable goes in the `Display` group (alongside `Table`, `Skeleton`, etc.). Add:

```ts
{ to: '/components/datatable', label: 'DataTable' }
```

Match the exact shape and ordering used for other items in that group.

- [ ] **Step 3: Add the card in `ComponentsIndex.tsx`**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`, find the grid (likely a `<Stack>` or `<div>` rendering one card per component) and add a tile for DataTable with a brief description ("Tabular data with sortable / resizable / reorderable columns and row selection.") and a small live preview (a 2x2 mini-table or just the name).

Match the visual shape of adjacent tiles (e.g. `Table`, `Pagination`). When in doubt copy the `Table` tile's structure verbatim and swap the label/description.

- [ ] **Step 4: Check `mockups/registry.ts`**

Inspect `packages/playground/src/pages/mockups/registry.ts`. Phase 1 does not modify any mockup to use DataTable (that lands in later work). So **no change required** here. However, if you find any mockup file that already uses DataTable (it shouldn't yet), add `'DataTable'` to the relevant `usesComponents` list AND to the `ComponentName` union at the top of the file.

- [ ] **Step 5: Smoke-test in the playground**

```bash
make dev
```

Open http://localhost:8080/components/datatable in a browser. Verify:

- Header renders with the four columns (Deal, Stage, Amount, Owner)
- Body shows the four deals
- Hovering a header reveals the drag grip
- Clicking the "Deal" header label adds a sort indicator and cycles asc → desc → off
- The Selectable example toggles row selection; clicking elsewhere on a row alerts
- The Column visibility example's "Columns" button opens a dropdown menu
- The Loading example shows 4 skeleton rows
- The Empty example shows the default empty state

Stop dev (`Ctrl+C`).

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "playground: wire DataTableDemo into App route + sidebar + components grid

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — `AGENTS.md` TL;DR + final JSDoc audit

**Files:**

- Modify: `packages/design-system/AGENTS.md`
- Verify (no edit unless missing): JSDoc on `<DataTable>`, `useDataTable`, `<ColumnVisibilityTrigger>` includes `@example`, `@remarks When NOT to use`, `@remarks Anti-patterns`.

- [ ] **Step 1: Add the `<DataTable>` TL;DR section to AGENTS.md**

Find the "Components — TL;DR" section in `packages/design-system/AGENTS.md`. Add a new subsection after `<Table>` (since DataTable composes Table):

````markdown
### `<DataTable>` — server-driven data table with column features

```tsx
const instance = useDataTable<Deal>({
  data,
  columns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  sort,
  onSortChange: setSort,
});

<Cluster>
  <DataTable.ColumnVisibilityTrigger instance={instance} />
</Cluster>
<DataTable instance={instance} aria-label="Deals" />
```

- Config-driven via `columns: ColumnDef<T>[]`. Each column has a stable `id` used as the key for all per-column state.
- All state pieces (column order/sizing/visibility/pinning, row selection/expansion, sort) follow the Radix controlled/uncontrolled pattern: `value` + `onValueChange`, OR `defaultValue` only, OR neither.
- Server-driven sort/search/pagination. DataTable does NOT transform data — `data` must be the server's pre-sorted, pre-paginated slice. `onSortChange` is your trigger to refetch.
- `enableRowSelection: true` adds a leading checkbox column with select-all (indeterminate when partial). `toggleAllOnPage` ignores `pinnedRows`.
- Drag-to-reorder is keyboard-accessible (Tab to grip → Space to pick up → ←/→ to move → Space/Enter to drop → Esc to cancel). The grip is hover-revealed on desktop.
- Resize via the right-edge handle. Keyboard: focused header label, `←`/`→` for −/+8px; Shift+`←`/`→` for ±32px.
- `ColumnVisibilityTrigger` is the only built-in companion. For column pinning UI (Phase 2 ships state, no built-in UI), wire your own using `instance.pinColumn(id, side)`.
- **Phase 1 only**: column pinning is plumbed (`columnPinning` state + `pinColumn` helper) but the sticky CSS does NOT render yet — it lands in Phase 2 along with `pinnedRows` rendering. Expandable rows (`renderExpandedRow`) lands in Phase 3. The state plumbing is forward-compatible — code you write now keeps working when those phases ship.

**Anti-patterns:**

- ❌ Mutating `columns` array identity on every render. `useDataTable` captures `defaultColumnOrder` from `columns` once at mount — later identity changes don't trigger a re-derive of the default order. Use a stable reference (`useMemo` or module-level).
- ❌ Client-sorting `data` AND passing `sort` controlled. Pick one — server is the canonical source. Spinning both means rows reorder twice and ghost-rows appear during fetches.
- ❌ Rolling your own column visibility UI when `ColumnVisibilityTrigger` does the job. The built-in handles the "last column" guard for you.
- ❌ Using `<Table>` directly when you want any of: ordering, sizing, visibility, selection, sort indicator wiring. Compose `<DataTable>` instead — the primitive `<Table>` is for static read-only views.
````

- [ ] **Step 2: Audit JSDoc on the three public surfaces**

Verify each of these has the required JSDoc shape (per Hard rule 7 in `packages/design-system/CLAUDE.md`). Use this checklist:

```bash
grep -n "@example\|@remarks" packages/design-system/src/components/DataTable/DataTable.tsx
grep -n "@example\|@remarks" packages/design-system/src/components/DataTable/useDataTable.ts
grep -n "@example\|@remarks" packages/design-system/src/components/DataTable/ColumnVisibilityTrigger.tsx
```

Expected output: each file has at least one `@example` block and `@remarks` "When NOT to use" + "Anti-patterns" blocks.

If `useDataTable.ts` is missing JSDoc, add a function-level doc comment with:

```ts
/**
 * Headless state machine for `<DataTable>`. ...
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
 * @remarks When NOT to use
 * - For a read-only static table — use `<Table>` directly.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `value` and `defaultValue` for the same state piece — `value`
 *   wins and `defaultValue` is silently ignored. Pick one.
 * - ❌ Mutating `columns` identity across renders. See `<DataTable>` JSDoc.
 */
```

- [ ] **Step 3: Verify tests + build still pass**

```bash
make test && make build-lib && make lint
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md \
        packages/design-system/src/components/DataTable/
git commit -m "DataTable: AGENTS.md TL;DR + JSDoc audit pass

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17 — Pre-push review-fix cycle (Hard rule 8)

This is **non-optional** per `packages/design-system/CLAUDE.md` Rule 8 — and the user has a memory entry explicitly flagging it as mandatory.

**Files:** none directly — this task drives subagent-based review of the library work in this branch.

- [ ] **Step 1: Run all gates locally**

```bash
make test
make build-lib
make build
make lint
npm pack --dry-run --workspace @eocrm/design-system
```

Each must exit 0. If any fail, fix before proceeding to review.

- [ ] **Step 2: Spawn a fresh-context review subagent**

Use the `Agent` tool with `subagent_type: "general-purpose"`. Prompt template:

```
Review the DataTable Phase 1 work on this branch.

Scope: packages/design-system/src/components/DataTable/ and its exports.
Also touch: packages/design-system/src/index.ts, AGENTS.md, playground demo.

REQUIRED READING FIRST (in order):
1. packages/design-system/CLAUDE.md — the 10 hard rules
2. packages/design-system/AGENTS.md — component contract & anti-patterns
3. packages/design-system/README.md — consumer install / build context
4. docs/superpowers/specs/2026-05-22-datatable-design.md — the design source of truth

Then review the diff vs main against the 10 categories:
1. Bugs / correctness
2. Accessibility (keyboard, ARIA, focus management, screen reader)
3. API inconsistencies (prop naming, default values, type shape)
4. Type safety (no `any` without justification, exhaustive unions, generics)
5. Rule violations (Rules 1-7 in packages/design-system/CLAUDE.md)
6. Test coverage (controlled/uncontrolled, derived models, helpers, all integration paths)
7. Token discipline (Rule 3) — no raw colors / spacing / radii in .module.scss
8. SCSS quality (Rule 4 — no layout props on components, focus-visible per 3a)
9. Cross-package leakage (playground deps not used in library; lib doesn't import playground)
10. Package / distribution: anything new under src/ is whitelisted by files in package.json

Phase 2 (column pinning rendering, pinned rows) and Phase 3 (expandable row rendering)
are deferred — do NOT flag missing pinning sticky CSS or chevron rendering as bugs.
Phase 1 ships state plumbing for those, no render effects.

Output format: Critical / Important / Nice-to-have / Regression-watch.
End with verdict: "clean enough to stop" or "keep iterating".
```

- [ ] **Step 3: Fix every Critical + Important finding**

For each Critical or Important finding, fix in the codebase. For each deliberate skip (Nice-to-have or contested Important), leave a one-line note in your follow-up.

- [ ] **Step 4: Re-run gates**

```bash
make test && make build-lib && make build && make lint
```

- [ ] **Step 5: Spawn a second review subagent with the same prompt**

If verdict is "clean enough to stop", proceed. Otherwise repeat Step 3.

- [ ] **Step 6: Commit any fixes from the review loop**

Use a single commit for each round of fixes (do not amend earlier commits):

```bash
git add -A
git commit -m "DataTable: review-cycle fixes (round N)

$(cat <<'EOF'
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Push the branch**

The Husky pre-push hook runs prettier, stylelint, and typecheck. If it blocks, fix the underlying issue — never use `--no-verify` without explicit user authorization.

```bash
git push -u origin feat/datatable
```

---

## Task 18 — Open PR

**Files:** none — uses `gh`.

- [ ] **Step 1: Open the PR**

Per root `CLAUDE.md`: code/config/workflow changes go through PRs. Wait for the `Quality / check` status check.

```bash
gh pr create --title "DataTable Phase 1: hook + component + column visibility companion" --body "$(cat <<'EOF'
## Summary

- New `<DataTable>` component composing the `<Table>` primitive
- `useDataTable<T>` hook owns column-axis state (order / sizing / visibility / pinning) and row-axis state (selection / expansion / sort)
- `<DataTable.ColumnVisibilityTrigger>` built-in companion for show/hide menu
- Drag-to-reorder columns via `@dnd-kit/sortable` (with keyboard a11y)
- Hand-rolled pointer-based resize handle (keyboard ± resize via header label)
- Sticky header default-on; loading / empty / sortable / selectable states; row click handler

**Phase 1 of 3.** Column pinning rendering and expandable rows ship in phases 2 and 3 — state plumbing for both is included here so the API surface is forward-compatible.

Spec: `docs/superpowers/specs/2026-05-22-datatable-design.md`.

## Test plan

- [x] `useDataTable` pure-logic unit tests (controlled/uncontrolled resolution, all helpers, derived view-models including pin offsets)
- [x] `useResizeHandle` pointer + clamping tests
- [x] `useControllableState` controlled vs uncontrolled tests
- [x] `<DataTable>` integration tests (sort click, selection, row click, hidden columns, column order, loading, empty, ref forwarding, className merge)
- [x] `<ColumnVisibilityTrigger>` last-visible-guard + toggle tests
- [x] Playground demo manually exercised at /components/datatable
- [x] Hard-rule-8 pre-push review-fix cycle completed

Known gap: column drag-and-drop reorder is not unit-tested (jsdom limitation with `@dnd-kit`'s PointerSensor). Documented in the test file header. Playground demo is the smoke test; a Playwright e2e is the planned remedy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for CI**

```bash
gh pr checks --watch
```

Expected: `Quality / check` passes.

- [ ] **Step 3: Return PR URL to user**

```bash
gh pr view --json url --jq .url
```

Report the URL back to the user so they can review and merge.

---

## Plan Complete

After Task 18, Phase 1 is shipped. Phase 2 (column pinning rendering + pinned rows) and Phase 3 (expandable rows) each get their own plan via the `superpowers:writing-plans` skill, sourced from the same spec.
