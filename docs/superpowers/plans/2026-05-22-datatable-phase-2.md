# DataTable Phase 2 Implementation Plan — Column & Row Pinning Rendering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the rendering layer for column pinning (left/right sticky CSS with offset stacking + edge shadow + z-index intersection) and row pinning (separate `<tbody>` above main body). State plumbing already shipped in Phase 1; this phase only adds visual rendering of state that's already there.

**Architecture:** Cell pin-style derivation moves to a tiny pure helper (`pinStyle.ts`). `HeaderCell` and `BodyRow` both look up their column's pin side via the helper and apply `position: sticky` + cumulative `left`/`right` offsets inline. `DataTable` renders columns in `[auto][left-pinned][unpinned][right-pinned]` order across `<colgroup>`, header row, and body rows. Cross-pin-boundary drag rejection moves to a pure helper (`reorderColumns.ts`) extracted from `handleDragEnd`.

**Tech Stack:** Same as Phase 1 — React 18 + TS, source-distributed, CSS Modules + SCSS tokens. No new deps. Uses existing `instance.columnPinning`, `instance.leftPinnedColumns`, `instance.rightPinnedColumns`, `instance.unpinnedColumns`, `instance.leftPinOffsets`, `instance.rightPinOffsets`.

**Source of truth:** `docs/superpowers/specs/2026-05-22-datatable-design.md`. Phase 2 sections: "Column pinning" (rendering pipeline subsection), "Pinned rows" (rendering pipeline subsection), "Phase 2" entry under the "Phasing" section. Read those for any requirement not explicit in a task.

**Branch:** `feat/datatable-pinning`. Commit per task. Open a PR after the Hard-Rule-8 cycle.

---

## File Structure

```
packages/design-system/src/components/DataTable/
  pinStyle.ts                       ← NEW: pure helper getPinStyle(columnId, instance)
  pinStyle.test.ts                  ← NEW: unit tests
  reorderColumns.ts                 ← NEW: pure helper reorderRespectingPins(...)
  reorderColumns.test.ts            ← NEW: unit tests incl. cross-boundary rejection
  HeaderCell.tsx                    ← MODIFY: apply pin sticky style
  HeaderCell.module.scss            ← MODIFY: pinned-cell class + z-index + edge shadow
  BodyRow.tsx                       ← MODIFY: iterate cells in pin order, apply sticky style per cell; accept isPinned flag for tinted-row style
  DataTable.tsx                     ← MODIFY: <colgroup> + header row in pin order; auto-select cell sticky-left; render pinned <tbody> above main; use reorderRespectingPins in handleDragEnd
  DataTable.module.scss             ← MODIFY: pinnedRowsTbody class, pinnedRow tint, autoCell sticky-left
  DataTable.test.tsx                ← MODIFY: add Phase 2 rendering tests

packages/design-system/src/styles/tokens.scss   ← MODIFY: add `--color-bg-row-pinned`, `--shadow-table-pinned-edge`
packages/design-system/AGENTS.md                ← MODIFY: flip the "Phase 1 only" note
packages/playground/src/pages/components/DataTableDemo.tsx ← MODIFY: add pinning examples
```

**Decomposition rationale:**

- `pinStyle.ts` and `reorderColumns.ts` are pure functions. Extracting them lets us unit-test the offset/rejection math without DOM and keeps `HeaderCell` / `BodyRow` / `DataTable` focused on rendering wiring.
- `BodyRow` already iterates `instance.visibleColumns`; Phase 2 swaps that for an iteration in `[left-pinned, unpinned, right-pinned]` order. Same file, small edit.
- The pinned-rows section is just a second `<Table.Body>` rendered conditionally before the main body — no new component file; the JSX is small enough to inline in `DataTable.tsx`.

---

## Task 1 — Verify branch state + add new tokens

**Files:**
- Modify: `packages/design-system/src/styles/tokens.scss`

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
git log --oneline -3
```

Expected:
- Branch: `feat/datatable-pinning`
- Working tree clean
- Last commit on main: `247698e DataTable Phase 1: hook + component + column visibility companion (#37)`

- [ ] **Step 2: Add three new tokens to `tokens.scss`**

Open `packages/design-system/src/styles/tokens.scss`. Find the section where colors and shadows are defined. Add (near existing `--color-bg-*` tokens):

```scss
--color-bg-row-pinned: var(--color-bg-accent-subtle); /* subtle tint for always-visible pinned rows */
```

(If `--color-bg-accent-subtle` doesn't exist, find the closest existing background-tint token — pick whichever is used for "selected row" or similar gentle highlight. Whatever you pick, use a real existing token, not a raw color.)

Add (near existing `--shadow-*` tokens):

```scss
--shadow-table-pinned-edge: 4px 0 8px -4px rgba(0, 0, 0, 0.08); /* inside-edge shadow for sticky LEFT-pinned column */
--shadow-table-pinned-edge-right: -4px 0 8px -4px rgba(0, 0, 0, 0.08); /* mirror — for sticky RIGHT-pinned column */
```

The `rgba(0,0,0,0.08)` here is intentional — shadow tokens in this project use literal rgba values (check existing `--shadow-md` etc. in the file; they use raw rgba). If stylelint's strict-value rule complains, look at how an existing shadow token is defined and match.

- [ ] **Step 3: Verify lint passes**

```bash
make lint
```

Expected: clean. If stylelint flags the new shadow token's raw rgba, inspect an existing shadow token (`grep -n "shadow" packages/design-system/src/styles/tokens.scss`) and match its format.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss
git commit -m "DataTable Phase 2: add tokens --color-bg-row-pinned + --shadow-table-pinned-edge

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `pinStyle.ts` pure helper

**Files:**
- Create: `packages/design-system/src/components/DataTable/pinStyle.ts`
- Test: `packages/design-system/src/components/DataTable/pinStyle.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/design-system/src/components/DataTable/pinStyle.test.ts`:

```ts
import { getPinStyle, AUTO_CELL_WIDTH } from './pinStyle';
import type { DataTableInstance } from './types';

// Helper: build a minimal instance shape for the helper's needs.
function makeInstance(overrides: Partial<DataTableInstance<unknown>> = {}): DataTableInstance<unknown> {
  return {
    columnPinning: { left: [], right: [] },
    leftPinOffsets: {},
    rightPinOffsets: {},
    enableRowSelection: false,
    // Other fields aren't read by getPinStyle — cast to satisfy the type.
    ...overrides,
  } as DataTableInstance<unknown>;
}

describe('getPinStyle', () => {
  it('returns empty object for unpinned column', () => {
    const result = getPinStyle('name', makeInstance());
    expect(result).toEqual({});
  });

  it('returns sticky-left style with offset for left-pinned column', () => {
    const result = getPinStyle('name', makeInstance({
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }));
    expect(result).toEqual({
      position: 'sticky',
      left: 0,
      pinSide: 'left',
    });
  });

  it('returns sticky-right style with offset for right-pinned column', () => {
    const result = getPinStyle('actions', makeInstance({
      columnPinning: { left: [], right: ['actions'] },
      rightPinOffsets: { actions: 0 },
    }));
    expect(result).toEqual({
      position: 'sticky',
      right: 0,
      pinSide: 'right',
    });
  });

  it('shifts left offset by AUTO_CELL_WIDTH when enableRowSelection is true', () => {
    const result = getPinStyle('name', makeInstance({
      enableRowSelection: true,
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }));
    expect(result.left).toBe(AUTO_CELL_WIDTH);
  });

  it('does NOT shift right offset when enableRowSelection is true', () => {
    const result = getPinStyle('actions', makeInstance({
      enableRowSelection: true,
      columnPinning: { left: [], right: ['actions'] },
      rightPinOffsets: { actions: 0 },
    }));
    expect(result.right).toBe(0);
  });

  it('stacks left offsets: first left col = 0, second = first width, etc.', () => {
    const result = getPinStyle('status', makeInstance({
      columnPinning: { left: ['name', 'status'], right: [] },
      leftPinOffsets: { name: 0, status: 200 }, // name is 200px wide
    }));
    expect(result.left).toBe(200);
  });

  it('AUTO_CELL_WIDTH is 44', () => {
    expect(AUTO_CELL_WIDTH).toBe(44);
  });
});
```

- [ ] **Step 2: Run — expect failure** (module missing):

```bash
make test -- pinStyle.test.ts
```

- [ ] **Step 3: Implement the helper**

Create `packages/design-system/src/components/DataTable/pinStyle.ts`:

```ts
import type { DataTableInstance } from './types';

/**
 * Width of the auto-prepended selection cell. Kept here as the single source
 * of truth so DataTable.tsx and pinStyle.ts agree on the offset shift.
 */
export const AUTO_CELL_WIDTH = 44;

export interface PinStyle {
  position?: 'sticky';
  left?: number;
  right?: number;
  pinSide?: 'left' | 'right';
}

/**
 * Compute the sticky-positioning inline style for a column cell.
 *
 * - Unpinned columns return an empty object (no sticky styles).
 * - Left-pinned columns return `{ position: 'sticky', left: <px>, pinSide: 'left' }`.
 *   The `left` value is the column's cumulative offset from the hook
 *   (`instance.leftPinOffsets[columnId]`), shifted by `AUTO_CELL_WIDTH` when
 *   `enableRowSelection` is true (the auto-select cell consumes the leftmost
 *   `AUTO_CELL_WIDTH` of sticky space).
 * - Right-pinned columns return `{ position: 'sticky', right: <px>, pinSide: 'right' }`.
 *   No auto-cell shift on the right (the selection cell is on the left).
 */
export function getPinStyle<T>(columnId: string, instance: DataTableInstance<T>): PinStyle {
  const leftPinned = instance.columnPinning.left.includes(columnId);
  const rightPinned = instance.columnPinning.right.includes(columnId);

  if (leftPinned) {
    const offset = instance.leftPinOffsets[columnId] ?? 0;
    const shift = instance.enableRowSelection ? AUTO_CELL_WIDTH : 0;
    return { position: 'sticky', left: offset + shift, pinSide: 'left' };
  }
  if (rightPinned) {
    const offset = instance.rightPinOffsets[columnId] ?? 0;
    return { position: 'sticky', right: offset, pinSide: 'right' };
  }
  return {};
}
```

- [ ] **Step 4: Run — expect pass**

```bash
make test -- pinStyle.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/pinStyle.ts \
        packages/design-system/src/components/DataTable/pinStyle.test.ts
git commit -m "DataTable Phase 2: pinStyle helper (sticky-cell offset computation)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `reorderColumns.ts` pure helper (with cross-pin-boundary rejection)

**Files:**
- Create: `packages/design-system/src/components/DataTable/reorderColumns.ts`
- Test: `packages/design-system/src/components/DataTable/reorderColumns.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/design-system/src/components/DataTable/reorderColumns.test.ts`:

```ts
import { reorderRespectingPins, sameSide } from './reorderColumns';
import type { ColumnPinningState } from './types';

const noPin: ColumnPinningState = { left: [], right: [] };

describe('sameSide', () => {
  it('returns true when both columns are unpinned', () => {
    expect(sameSide('a', 'b', noPin)).toBe(true);
  });
  it('returns true when both columns are left-pinned', () => {
    expect(sameSide('a', 'b', { left: ['a', 'b'], right: [] })).toBe(true);
  });
  it('returns true when both columns are right-pinned', () => {
    expect(sameSide('a', 'b', { left: [], right: ['a', 'b'] })).toBe(true);
  });
  it('returns false when one is left-pinned and the other unpinned', () => {
    expect(sameSide('a', 'b', { left: ['a'], right: [] })).toBe(false);
  });
  it('returns false when one is right-pinned and the other unpinned', () => {
    expect(sameSide('a', 'b', { left: [], right: ['a'] })).toBe(false);
  });
  it('returns false when one is left-pinned and the other right-pinned', () => {
    expect(sameSide('a', 'b', { left: ['a'], right: ['b'] })).toBe(false);
  });
});

describe('reorderRespectingPins', () => {
  it('returns null when active and over are on different pin sides', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'b',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: ['a'], right: [] },
    });
    expect(result).toBeNull();
  });

  it('reorders unpinned columns when both are unpinned', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'c',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('reorders within left-pinned set', () => {
    // Drag b before a in the left-pinned group; c stays unpinned and last.
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'b',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: ['a', 'b'], right: [] },
    });
    expect(result).toEqual(['b', 'a', 'c']);
  });

  it('reorders within right-pinned set', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'c',
      overId: 'b',
      visibleIds: ['a', 'b', 'c'],
      pinning: { left: [], right: ['b', 'c'] },
    });
    expect(result).toEqual(['a', 'c', 'b']);
  });

  it('preserves hidden columns at their absolute positions', () => {
    // 'hidden' is in columnOrder but not visible (so dnd-kit doesn't see it).
    const result = reorderRespectingPins({
      prev: ['a', 'hidden', 'b', 'c'],
      activeId: 'a',
      overId: 'c',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toEqual(['b', 'hidden', 'c', 'a']);
  });

  it('returns null when active equals over (no-op)', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'a',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toBeNull();
  });

  it('returns null when active or over not in prev', () => {
    const result = reorderRespectingPins({
      prev: ['a', 'b', 'c'],
      activeId: 'ghost',
      overId: 'a',
      visibleIds: ['a', 'b', 'c'],
      pinning: noPin,
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
make test -- reorderColumns.test.ts
```

- [ ] **Step 3: Implement the helper**

Create `packages/design-system/src/components/DataTable/reorderColumns.ts`:

```ts
import type { ColumnOrderState, ColumnPinningState } from './types';

/**
 * True when both columns are on the same pin "side": both unpinned, both
 * left-pinned, or both right-pinned. Used to reject cross-pin-boundary drag
 * drops. A column can be pinned to at most one side; if data is malformed
 * (in both lists), the function treats it as left-pinned (left checked first).
 */
export function sameSide(a: string, b: string, pinning: ColumnPinningState): boolean {
  const aSide = pinning.left.includes(a) ? 'left' : pinning.right.includes(a) ? 'right' : 'unpinned';
  const bSide = pinning.left.includes(b) ? 'left' : pinning.right.includes(b) ? 'right' : 'unpinned';
  return aSide === bSide;
}

export interface ReorderArgs {
  prev: ColumnOrderState;
  activeId: string;
  overId: string;
  visibleIds: string[];
  pinning: ColumnPinningState;
}

/**
 * Reorder columns within their pin side. Returns the new `ColumnOrderState`,
 * or `null` if the move should be rejected:
 *
 * - active and over are not on the same pin side (cross-boundary drag)
 * - active === over (no-op)
 * - active or over not found in `prev`
 *
 * The reorder operates on the visible-column slice and then re-slots the
 * reordered ids back into `prev` at the same absolute positions, so hidden
 * columns retain their positions in `columnOrder`. (Same algorithm as Phase 1's
 * inline reorder; just adds the same-side check.)
 */
export function reorderRespectingPins(args: ReorderArgs): ColumnOrderState | null {
  const { prev, activeId, overId, visibleIds, pinning } = args;
  if (activeId === overId) return null;
  if (!prev.includes(activeId) || !prev.includes(overId)) return null;
  if (!sameSide(activeId, overId, pinning)) return null;

  const visible = prev.filter((id) => visibleIds.includes(id));
  const fromIdx = visible.indexOf(activeId);
  const toIdx = visible.indexOf(overId);
  if (fromIdx === -1 || toIdx === -1) return null;

  const reorderedVisible = [...visible];
  const [moved] = reorderedVisible.splice(fromIdx, 1);
  reorderedVisible.splice(toIdx, 0, moved!);

  let cursor = 0;
  return prev.map((id) => {
    if (visibleIds.includes(id)) {
      return reorderedVisible[cursor++]!;
    }
    return id;
  });
}
```

- [ ] **Step 4: Run — expect pass**

```bash
make test -- reorderColumns.test.ts
```

Expected: all 12 tests (6 `sameSide` + 6 `reorderRespectingPins`) pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/reorderColumns.ts \
        packages/design-system/src/components/DataTable/reorderColumns.test.ts
git commit -m "DataTable Phase 2: reorderColumns helper with cross-pin-boundary rejection

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Wire `reorderRespectingPins` into `DataTable.tsx`

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx`

- [ ] **Step 1: Update `handleDragEnd` to use the new helper**

In `packages/design-system/src/components/DataTable/DataTable.tsx`:

Add an import at the top:

```ts
import { reorderRespectingPins } from './reorderColumns';
```

Replace the body of `handleDragEnd` (currently inline reorder logic) with:

```tsx
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
```

- [ ] **Step 2: Verify tests still pass**

```bash
make test
```

All Phase 1 tests must still pass (1047 of them) since the algorithm is the same when no columns are pinned. The new helper's tests are also passing now.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.tsx
git commit -m "DataTable Phase 2: route handleDragEnd through reorderRespectingPins

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Apply sticky CSS in `HeaderCell.tsx`

**Files:**
- Modify: `packages/design-system/src/components/DataTable/HeaderCell.tsx`
- Modify: `packages/design-system/src/components/DataTable/HeaderCell.module.scss`

- [ ] **Step 1: Update `HeaderCell.tsx` to apply pin style**

In `packages/design-system/src/components/DataTable/HeaderCell.tsx`:

Add import:

```ts
import { getPinStyle } from './pinStyle';
```

Find the section where `dragStyle` is computed:

```ts
const dragStyle = {
  transform: CSS.Transform.toString(transform),
  transition,
} as const;
```

Replace it with:

```tsx
const pinStyle = getPinStyle(column.id, instance);
const stickyStyle = pinStyle.position
  ? { position: pinStyle.position, left: pinStyle.left, right: pinStyle.right }
  : undefined;
const cellStyle = {
  transform: CSS.Transform.toString(transform),
  transition,
  ...stickyStyle,
};
```

Find the `<Table.HeaderCell>` opening tag and update its `style` prop + `className`:

```tsx
    <Table.HeaderCell
      align={column.align ?? 'start'}
      aria-sort={sortDir != null ? sortAriaMap[sortDir] : undefined}
      onClick={sortable ? () => instance.toggleSort(column.id) : undefined}
      className={clsx(
        styles.headerCell,
        isDragging && styles.dragging,
        pinStyle.pinSide === 'left' && styles.pinnedLeft,
        pinStyle.pinSide === 'right' && styles.pinnedRight,
      )}
      // HTMLTableCellElement extends HTMLElement; dnd-kit only reads DOM geometry from the ref.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={setNodeRef as any}
      style={cellStyle}
    >
```

(The variable was previously named `dragStyle`; rename to `cellStyle` to reflect that it now also carries pin sticky styles.)

- [ ] **Step 2: Add styles in `HeaderCell.module.scss`**

Open `packages/design-system/src/components/DataTable/HeaderCell.module.scss`. At the end of the file (or alongside `.headerCell`), add:

```scss
// Pinned columns get sticky positioning via inline `left` / `right` styles;
// these class additions handle the background (otherwise body cells would
// scroll under transparent pinned headers) and the inside-edge shadow.

.pinnedLeft,
.pinnedRight {
  // Solid background so unpinned content doesn't show through during scroll.
  // Use the cell's normal background — Table's <th> already has its own bg
  // token applied; we re-assert it here to defeat transparency.
  background: var(--color-bg-default);
  // Sticky header (existing Table behavior) gives z-index: 2; a pinned header
  // is the "corner" cell — it needs to stack above both the header band and
  // the body's pinned column cells (which get z-index: 1).
  z-index: 3;
}

.pinnedLeft {
  // Inside-edge shadow on the right of left-pinned columns.
  box-shadow: var(--shadow-table-pinned-edge);
}

.pinnedRight {
  // Inside-edge shadow on the LEFT of right-pinned columns — mirror the offset.
  box-shadow: calc(-1 * 4px) 0 8px -4px rgba(0, 0, 0, 0.08);
}
```

The `--shadow-table-pinned-edge-right` token was added in Task 1; both halves of the pair are now available.

If `var(--color-bg-default)` doesn't exist as a token, find the actual default cell background token in tokens.scss (`grep "color-bg" packages/design-system/src/styles/tokens.scss`) and use it. Common candidates: `--color-bg`, `--color-bg-app`, `--color-bg-surface`.

- [ ] **Step 3: Verify build + tests**

```bash
make build-lib
make test
make lint
```

All must pass. Test count should still be 1047 + the new pinStyle/reorderColumns ones (~1066 total at this point).

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DataTable/HeaderCell.tsx \
        packages/design-system/src/components/DataTable/HeaderCell.module.scss
git commit -m "DataTable Phase 2: HeaderCell applies pinning sticky + edge shadow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Render columns in pin order in `DataTable.tsx`

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx`
- Modify: `packages/design-system/src/components/DataTable/DataTable.module.scss`

The current rendering iterates `instance.visibleColumns` in flat order. We need to render them as `[left-pinned, unpinned, right-pinned]` in the colgroup, the header row, and (in Task 7) the body rows.

Also: the auto-select cell becomes sticky-left at offset 0 in this phase, always when `enableRowSelection` is true.

- [ ] **Step 1: Consolidate `AUTO_CELL_WIDTH` constant**

`DataTable.tsx` currently has its own `const AUTO_CELL_WIDTH = 44;`. `pinStyle.ts` (Task 2) exports the same value. Remove the local constant and import from `pinStyle`:

```ts
// Remove this line:
// const AUTO_CELL_WIDTH = 44;
```

Add to the imports at the top:

```ts
import { AUTO_CELL_WIDTH } from './pinStyle';
```

All existing usages of `AUTO_CELL_WIDTH` in DataTable.tsx continue to work.

- [ ] **Step 2: Build the pin-ordered iteration list**

In `DataTable.tsx`, find the section just before the JSX `return`. Add a memoized ordered list:

```tsx
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
```

- [ ] **Step 3: Use `renderColumns` in `<colgroup>`**

Replace the `<colgroup>` block:

```tsx
          <colgroup>
            {instance.enableRowSelection && <col style={{ width: AUTO_CELL_WIDTH }} />}
            {renderColumns.map((col) => (
              <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
            ))}
          </colgroup>
```

- [ ] **Step 4: Use `renderColumns` in the header row + make auto-cell sticky-left**

Replace the header row block:

```tsx
          <Table.Header>
            <Table.Row>
              {instance.enableRowSelection && (
                <Table.HeaderCell
                  align="center"
                  scope="col"
                  className={clsx(styles.autoCell, styles.autoCellSticky)}
                  style={{ position: 'sticky', left: 0 }}
                >
                  <Checkbox
                    checked={instance.isAllOnPageSelected()}
                    indeterminate={instance.isSomeOnPageSelected()}
                    onChange={() => instance.toggleAllOnPage()}
                    aria-label="Select all rows on page"
                  />
                </Table.HeaderCell>
              )}
              {renderColumns.map((col) => (
                <HeaderCell key={col.id} column={col} instance={instance} />
              ))}
            </Table.Row>
          </Table.Header>
```

- [ ] **Step 5: Add `.autoCellSticky` class to SCSS**

In `packages/design-system/src/components/DataTable/DataTable.module.scss`, add:

```scss
.autoCellSticky {
  // Auto-select cell is always sticky-left at offset 0 from Phase 2 onward.
  // Background must be opaque so scrolling content doesn't show through.
  background: var(--color-bg-default);
  // Same z-index ladder as HeaderCell.module.scss: header corner cells win.
  z-index: 3;
}
```

(Use the same default-background token you settled on in Task 5.)

The same `.autoCellSticky` class is reused in body rows in Task 7 — there the z-index will be 1 (body level), which we'll handle via a `tbody .autoCellSticky` descendant rule. For now, the header version is fine.

Actually, to keep z-index correct, split into two classes:

```scss
.autoCellSticky {
  background: var(--color-bg-default);
}

// Header version: in a <thead> sticky-header context.
:global(thead) .autoCellSticky {
  z-index: 3;
}

// Body version: must stay above unpinned body cells but below sticky header.
:global(tbody) .autoCellSticky {
  z-index: 1;
}
```

Avoiding `:global` is preferred — but Table's `<thead>` / `<tbody>` are not classed, so this is the simplest signal. If the linter dislikes `:global`, an alternative: pass a separate className from the consumer in Task 7 for the body version.

- [ ] **Step 6: Verify**

```bash
make test
make build-lib
make lint
```

All must pass. The existing tests don't check pin order specifically — they check things like "Alpha appears" or "header X is at index 0" with no pinning configured, so order is `[unpinned cols]` which equals `[visibleColumns]`. No regression expected.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.tsx \
        packages/design-system/src/components/DataTable/DataTable.module.scss
git commit -m "DataTable Phase 2: render <colgroup> + header row in pin order; auto-cell sticky-left

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Render body cells in pin order with sticky styles

**Files:**
- Modify: `packages/design-system/src/components/DataTable/BodyRow.tsx`
- Modify: `packages/design-system/src/components/DataTable/DataTable.module.scss`

- [ ] **Step 1: Update `BodyRow.tsx`**

Replace the contents of `packages/design-system/src/components/DataTable/BodyRow.tsx` with:

```tsx
import { type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import { getPinStyle } from './pinStyle';
import type { DataTableInstance, ColumnDef } from './types';
import styles from './DataTable.module.scss';

export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
  /** When true, paint the row with the pinned-row background tint. */
  isPinnedRow?: boolean;
}

/**
 * One row of the body. Handles:
 *  - selection auto-cell (when `instance.enableRowSelection`) — sticky-left
 *  - row click (when `instance.onRowClick`) — ignored if click target is an
 *    interactive child so checkbox/button clicks don't bubble.
 *  - row Enter keypress fires onRowClick when row is focusable.
 *  - data cells rendered in pin order: [left-pinned, unpinned, right-pinned].
 *    Pinned cells receive `position: sticky` with cumulative offsets via
 *    `getPinStyle`.
 *  - `isPinnedRow` paints the row with `--color-bg-row-pinned` tint (used by
 *    the pinned-rows section above the main body).
 */
export function BodyRow<T>({ row, instance, isPinnedRow }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) return;
    instance.onRowClick(row, e);
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (
      target !== e.currentTarget &&
      target.closest('button, input, a, [role="button"], [role="checkbox"]')
    ) {
      return;
    }
    e.preventDefault();
    instance.onRowClick(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };

  // Pin-ordered render list — same composition as DataTable.tsx's renderColumns.
  const renderColumns: ColumnDef<T>[] = [
    ...instance.leftPinnedColumns,
    ...instance.unpinnedColumns,
    ...instance.rightPinnedColumns,
  ];

  return (
    <Table.Row
      selected={selected || undefined}
      onClick={instance.onRowClick ? onRowClick : undefined}
      onKeyDown={instance.onRowClick ? onRowKeyDown : undefined}
      tabIndex={instance.onRowClick ? 0 : undefined}
      className={clsx(
        instance.onRowClick && styles.clickableRow,
        isPinnedRow && styles.pinnedRow,
      )}
    >
      {instance.enableRowSelection && (
        <Table.Cell
          className={clsx(styles.autoCell, styles.autoCellSticky)}
          align="center"
          style={{ position: 'sticky', left: 0 }}
          // Stop clicks anywhere in the selection cell from bubbling to the row's
          // onRowClick handler. The closest(...) filter in onRowClick catches the
          // input but not the styled checkbox span sibling.
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={() => instance.toggleRowSelection(rowId)}
            aria-label={`Select row ${rowId}`}
          />
        </Table.Cell>
      )}
      {renderColumns.map((col) => {
        const pin = getPinStyle(col.id, instance);
        const cellStyle = pin.position
          ? { position: pin.position, left: pin.left, right: pin.right }
          : undefined;
        return (
          <Table.Cell
            key={col.id}
            align={col.align ?? 'start'}
            className={clsx(
              pin.pinSide === 'left' && styles.pinnedLeft,
              pin.pinSide === 'right' && styles.pinnedRight,
            )}
            style={cellStyle}
          >
            {col.cell(row, { row, rowId, column: col, instance })}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}
```

- [ ] **Step 2: Add pinned-cell + pinned-row body styles to `DataTable.module.scss`**

In `packages/design-system/src/components/DataTable/DataTable.module.scss`, append:

```scss
// Body pinned-cell sticky styles. Mirrors HeaderCell.module.scss's
// .pinnedLeft / .pinnedRight but at body z-index (1 instead of 3).

.pinnedLeft,
.pinnedRight {
  background: var(--color-bg-default);
  z-index: 1;
}

.pinnedLeft {
  box-shadow: var(--shadow-table-pinned-edge);
}

.pinnedRight {
  box-shadow: var(--shadow-table-pinned-edge-right);
}

// Pinned rows (separate <tbody> above the main body) get a subtle tint.
.pinnedRow {
  background: var(--color-bg-row-pinned);

  // Pinned cells inside a pinned row keep their stickyness but inherit the
  // tint by way of a transparent background. Otherwise the cell-level
  // `--color-bg-default` from .pinnedLeft would override the row tint.
  & .pinnedLeft,
  & .pinnedRight {
    background: var(--color-bg-row-pinned);
  }
}

// Dedicated tbody class for the pinned-rows section (used in Task 8).
.pinnedRowsTbody {
  // No layout-affecting styles — Rule 4. Background and visual modifiers only.
  background: var(--color-bg-row-pinned);
}
```

- [ ] **Step 3: Verify**

```bash
make test
make build-lib
make lint
```

All must pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DataTable/BodyRow.tsx \
        packages/design-system/src/components/DataTable/DataTable.module.scss
git commit -m "DataTable Phase 2: BodyRow renders cells in pin order with sticky styles

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Pinned rows section in `DataTable.tsx`

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx`

- [ ] **Step 1: Render a second `<Table.Body>` for pinned rows**

In `DataTable.tsx`, find the section that opens with `<Table.Body>` for the main rows. Right BEFORE it (and after the `<Table.Header>` closing tag), insert the pinned-rows section:

```tsx
          {instance.pinnedRows.length > 0 && (
            <Table.Body className={styles.pinnedRowsTbody} aria-label="Pinned rows">
              {instance.pinnedRows.map((row) => (
                <BodyRow
                  key={instance.getRowId(row)}
                  row={row}
                  instance={instance}
                  isPinnedRow
                />
              ))}
            </Table.Body>
          )}
```

The main `<Table.Body>` below it stays unchanged.

- [ ] **Step 2: Verify**

```bash
make test
make build-lib
```

All must pass. No existing test currently passes `pinnedRows`, so behavior is unchanged for current consumers.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.tsx
git commit -m "DataTable Phase 2: render pinned-rows <tbody> above main body

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Phase 2 rendering tests

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

- [ ] **Step 1: Append Phase 2 rendering tests**

Open `packages/design-system/src/components/DataTable/DataTable.test.tsx`. Find the end of the `describe('<DataTable>', () => {` block (the closing `})` at the bottom). Add these tests inside, just before the closing `})`:

```tsx
  // ─── Phase 2: pinning rendering ───────────────────────────────────────

  it('renders pinned-left columns with sticky CSS and computed left offset', () => {
    const { container } = render(
      <Harness defaultColumnPinning={{ left: ['name'], right: [] }} />,
    );
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ position: 'sticky', left: '0px' });
    // Body cell for 'name' in first row should also be sticky.
    const firstBodyRow = container.querySelectorAll('tbody tr')[0]!;
    const nameCell = firstBodyRow.querySelectorAll('td')[0]!; // 'name' is first because left-pinned
    expect(nameCell).toHaveStyle({ position: 'sticky', left: '0px' });
  });

  it('shifts left pin offset by 44px when enableRowSelection is true', () => {
    render(
      <Harness
        enableRowSelection
        defaultColumnPinning={{ left: ['name'], right: [] }}
      />,
    );
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ left: '44px' });
  });

  it('renders pinned-right columns with sticky right CSS', () => {
    render(
      <Harness defaultColumnPinning={{ left: [], right: ['amount'] }} />,
    );
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    expect(amountHeader).toHaveStyle({ position: 'sticky', right: '0px' });
  });

  it('renders columns in pin order: [left-pinned, unpinned, right-pinned]', () => {
    render(
      <Harness defaultColumnPinning={{ left: ['amount'], right: [] }} />,
    );
    const headers = screen.getAllByRole('columnheader');
    // 'amount' pinned-left → first; 'name' unpinned → second
    expect(headers[0]!.textContent).toMatch(/amount/i);
    expect(headers[1]!.textContent).toMatch(/name/i);
  });

  it('auto-select cell is sticky-left at offset 0 when enableRowSelection is true', () => {
    render(<Harness enableRowSelection />);
    // The select-all <th> is the first columnheader.
    const headers = screen.getAllByRole('columnheader');
    const selectHeader = headers[0]!;
    expect(selectHeader).toHaveStyle({ position: 'sticky', left: '0px' });
  });

  it('renders pinnedRows in a separate <tbody> above main body', () => {
    const pinned = [{ id: 'p1', name: 'PINNED', amount: 99 }];
    function PinnedHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<PinnedHarness />);
    const tbodies = container.querySelectorAll('tbody');
    expect(tbodies.length).toBe(2);
    const pinnedTbody = tbodies[0]!;
    expect(within(pinnedTbody as HTMLElement).getByText('PINNED')).toBeInTheDocument();
  });

  it('pinnedRows tbody is labelled "Pinned rows" for screen readers', () => {
    const pinned = [{ id: 'p1', name: 'PINNED', amount: 99 }];
    function PinnedHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<PinnedHarness />);
    const pinnedTbody = container.querySelector('tbody[aria-label="Pinned rows"]');
    expect(pinnedTbody).not.toBeNull();
  });

  it('does NOT render pinned-rows tbody when pinnedRows is empty/absent', () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll('tbody').length).toBe(1);
  });
```

- [ ] **Step 2: Run — expect pass**

```bash
make test
```

Expected: all tests pass (1047 Phase 1 + new pinStyle/reorderColumns + the 8 new rendering tests = ~1075).

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.test.tsx
git commit -m "DataTable Phase 2: rendering tests for column + row pinning

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — Update playground demo with pinning examples

**Files:**
- Modify: `packages/playground/src/pages/components/DataTableDemo.tsx`

- [ ] **Step 1: Add two new examples**

Open `packages/playground/src/pages/components/DataTableDemo.tsx`. After the existing `EmptyExample` function (or any sensible spot in the example list inside `DataTableDemo`), add two new examples.

Add to the `DataTableDemo` function's example list (the JSX inside `<DemoLayout>`), e.g. right after `<EmptyExample />`:

```tsx
      <PinningExample />
      <PinnedRowsExample />
```

Then add the two new example functions at the bottom of the file:

```tsx
function PinningExample() {
  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    defaultColumnPinning: { left: ['name'], right: ['amount'] },
  });

  return (
    <Example
      title="Column pinning (left + right)"
      description='Pin a column to the left or right with `columnPinning`. Left-pinned columns stick to the left edge during horizontal scroll; right-pinned to the right. The selection auto-column is always sticky-left at offset 0. Scroll the demo horizontally (resize columns to make it overflow) to see the effect. No built-in pin/unpin UI — wire your own via `instance.pinColumn(id, side)`.'
      code={`const instance = useDataTable({
  data, columns, getRowId,
  defaultColumnPinning: { left: ['name'], right: ['amount'] },
});
<DataTable instance={instance} />`}
    >
      <DataTable instance={instance} aria-label="Deals (pinning)" />
    </Example>
  );
}

function PinnedRowsExample() {
  const starred: Deal[] = [
    { id: 's1', name: '⭐ Starred deal', stage: 'Won', amount: 50000, owner: 'Sara' },
  ];
  const instance = useDataTable<Deal>({
    data: deals,
    pinnedRows: starred,
    columns: dealColumns,
    getRowId: (r) => r.id,
  });

  return (
    <Example
      title="Row pinning (starred-row pattern)"
      description="Pinned rows render in a separate <tbody> above the main body and ignore pagination. Consumer supplies `pinnedRows` as a separate array — typically from a separate server query. Selection inside the pinned section is per-row; the header select-all only touches `data` (the current page)."
      code={`const instance = useDataTable({
  data,                       // current page from server
  pinnedRows: starredDeals,   // separate query
  columns, getRowId,
});`}
    >
      <DataTable instance={instance} aria-label="Deals (pinned rows)" />
    </Example>
  );
}
```

- [ ] **Step 2: Verify**

```bash
make build
```

If TypeScript complains about missing imports or props, fix the demo file (don't change the library).

- [ ] **Step 3: Smoke-test in the browser (optional but recommended)**

```bash
make dev &
sleep 5
```

Open http://localhost:8080/components/datatable in a browser. Verify the two new examples render. Resize the parent container narrow enough to trigger horizontal scroll on the pinning example — left-pinned "Deal" column should stay visible at the left edge, right-pinned "Amount" at the right.

Stop dev:

```bash
kill %1 2>/dev/null || pkill -f "vite" || true
```

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/DataTableDemo.tsx
git commit -m "playground: DataTableDemo — add column pinning + row pinning examples

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — Update AGENTS.md and JSDoc to reflect Phase 2 ship

**Files:**
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx` (JSDoc only)

- [ ] **Step 1: Flip the "Phase 1 only" note in AGENTS.md**

In `packages/design-system/AGENTS.md`, find the DataTable TL;DR section. There's a bullet that says (roughly):

> **Phase 1 only**: column pinning is plumbed (`columnPinning` state + `pinColumn` helper) but the sticky CSS does NOT render yet — it lands in Phase 2 along with `pinnedRows` rendering. Expandable rows (`renderExpandedRow`) lands in Phase 3. The state plumbing is forward-compatible — code you write now keeps working when those phases ship.

Replace with:

> **Phase 2 ships pinning rendering.** `columnPinning` now applies sticky CSS with cumulative offsets and an inside-edge shadow; `pinnedRows` renders in a separate `<tbody>` above the main body. The selection auto-column is auto-left-pinned at offset 0. Cross-pin-boundary drag drops are rejected — pinned columns can only be reordered within their pin group. Expandable rows (`renderExpandedRow`) still lands in Phase 3.

- [ ] **Step 2: Update DataTable JSDoc**

In `packages/design-system/src/components/DataTable/DataTable.tsx`, find the `@remarks When NOT to use` block. Currently it mentions "Phase 1 doesn't virtualize" — that's still true, leave it. Find the `@example` block above; add a small reference example below it (after the existing one) showing pinning:

```ts
 * @example
 * // Column pinning + pinned rows
 * const instance = useDataTable({
 *   data, pinnedRows: starredDeals, columns, getRowId,
 *   defaultColumnPinning: { left: ['name'], right: ['actions'] },
 * });
 * <DataTable instance={instance} aria-label="Deals" />;
```

Place it right after the existing `@example` block, before `@remarks When NOT to use`.

- [ ] **Step 3: Verify**

```bash
make test
make build-lib
make lint
```

All must pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md \
        packages/design-system/src/components/DataTable/DataTable.tsx
git commit -m "DataTable Phase 2: AGENTS.md + JSDoc reflect pinning rendering ship

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — Pre-push review-fix cycle (Hard rule 8)

**Files:** none directly — drives subagent-based review.

- [ ] **Step 1: Run all gates locally**

```bash
make test
make build-lib
make build
make lint
npm pack --dry-run --workspace @eocrm/design-system
```

Each must exit 0.

- [ ] **Step 2: Spawn a fresh-context review subagent**

Use the `Agent` tool with `subagent_type: "general-purpose"`. Prompt:

```
Review the DataTable Phase 2 work on this branch (feat/datatable-pinning).

Scope: changes in packages/design-system/src/components/DataTable/ since main.
Also touches: packages/design-system/src/styles/tokens.scss,
packages/design-system/AGENTS.md, playground/src/pages/components/DataTableDemo.tsx.

REQUIRED READING FIRST (in order):
1. packages/design-system/CLAUDE.md — 10 hard rules
2. packages/design-system/AGENTS.md — component contracts
3. docs/superpowers/specs/2026-05-22-datatable-design.md — design source of truth
   (look specifically at Column pinning rendering, Pinned rows, Phase 2 list)

Then review `git diff main...HEAD -- packages/design-system/ packages/playground/` against the 10 categories:
1. Bugs / correctness — esp. offset math at edges (empty pin lists, hidden pinned col)
2. A11y — keyboard nav still works with pin order; pinned rows tbody has aria-label
3. API inconsistencies — no new public props this phase; ensure existing ones unchanged
4. Type safety — new helpers fully typed; no new `any`
5. Hard rule violations (Rules 1–7) — tests, demo, tokens, focus-visible, layout, exports
6. Test coverage — pin offsets, cross-boundary rejection, sticky styles applied, pinned tbody present
7. Token discipline (Rule 3) — new tokens declared in tokens.scss; no raw rgba elsewhere
8. SCSS quality (Rule 4) — pinning classes don't introduce layout properties
9. Cross-package leakage
10. Package / distribution

Phase 3 (expandable rows) is DEFERRED. Do NOT flag missing chevron / detail row.

Output: Critical / Important / Nice-to-have / Regression-watch + verdict
"clean enough to stop" or "keep iterating".
```

- [ ] **Step 3: Fix every Critical + Important finding**

For each finding, fix in the codebase. Document any deliberate skips.

- [ ] **Step 4: Re-run gates after fixes**

```bash
make test && make build-lib && make build && make lint
```

- [ ] **Step 5: Spawn a second review with the same prompt**

If verdict is "clean enough to stop", proceed. Otherwise loop back to Step 3.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "DataTable Phase 2: review-cycle fixes (round N)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Push the branch**

The Husky pre-push hook runs prettier, stylelint, typecheck. If it blocks on prettier, run:

```bash
npx prettier --write packages/design-system/src/components/DataTable/ \
                     packages/playground/src/pages/components/DataTableDemo.tsx \
                     packages/design-system/AGENTS.md
git add -A
git commit -m "DataTable Phase 2: prettier --write

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Then:

```bash
git push -u origin feat/datatable-pinning
```

Never use `--no-verify` without explicit user authorization.

---

## Task 13 — Open PR

- [ ] **Step 1: Open the PR**

```bash
gh pr create --title "DataTable Phase 2: column + row pinning rendering" --body "$(cat <<'EOF'
## Summary

- Column pinning **rendering** lands (state plumbing already shipped in Phase 1).
  Pinned columns get `position: sticky` with cumulative `left` / `right` offsets
  computed by the hook, plus an inside-edge shadow and proper z-index stacking
  at the sticky-header / pinned-column corners.
- Selection auto-column is auto-left-pinned at offset 0 — visible always when
  `enableRowSelection`.
- `pinnedRows` renders in a separate `<tbody aria-label="Pinned rows">` above
  the main body (always-visible across pagination/sort — the "starred row"
  pattern).
- Drag-to-reorder rejects drops that cross pin-side boundaries. The reorder
  algorithm is extracted into a pure `reorderRespectingPins` helper.
- New tokens: `--color-bg-row-pinned`, `--shadow-table-pinned-edge`,
  `--shadow-table-pinned-edge-right`.
- Playground demo gets two new examples: column pinning and pinned rows.

**Phase 2 of 3.** Expandable rows (`renderExpandedRow`) is the final Phase 3.

Spec: `docs/superpowers/specs/2026-05-22-datatable-design.md`
Plan: `docs/superpowers/plans/2026-05-22-datatable-phase-2.md`

## Test plan

- [x] New pure-helper unit tests: `pinStyle` (offset math, auto-cell shift),
      `reorderColumns` (cross-boundary rejection, hidden-column preservation)
- [x] New integration tests: pinned-left / pinned-right cells render with sticky
      CSS, pin order respected in headers, auto-cell sticky-left, pinned-rows
      `<tbody>` rendered with aria-label, no pinned tbody when empty
- [x] All Phase 1 tests still pass (1047 → ~1075 with Phase 2 additions)
- [x] Playground demo manually exercised at /components/datatable
- [x] Hard-rule-8 pre-push review-fix cycle completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Watch CI**

```bash
gh pr checks --watch
```

Expected: `Quality / check` passes.

- [ ] **Step 3: Report PR URL**

```bash
gh pr view --json url --jq .url
```

Return the URL to the user.

---

## Plan complete

After Task 13, Phase 2 ships. Phase 3 (expandable rows) is the last remaining slice — its own plan, sourced from the same spec.
