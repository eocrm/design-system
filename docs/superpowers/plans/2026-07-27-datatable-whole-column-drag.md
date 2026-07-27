# DataTable whole-column drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a DataTable column is dragged to reorder, its body cells travel with its header instead of the header row reordering past a frozen body.

**Architecture:** Column offsets are published as CSS custom properties on the `<table>` element, written imperatively from dnd-kit's drag events. Body and header cells carry a static `transform: translateX(var(--dt-shift-<key>, 0px))` and move on the compositor, so React does no work between drag start and drag end. Geometry lives in a pure function; the DOM writes live in a hook mounted as a leaf inside `DndContext`.

**Tech Stack:** React 19, TypeScript, `@dnd-kit/core` + `@dnd-kit/sortable`, SCSS modules, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-27-datatable-whole-column-drag-design.md`

## Global Constraints

- Package: `packages/design-system/` — all Hard rules in `packages/design-system/CLAUDE.md` apply.
- Vitest runs with `globals: true`. Do **not** import `describe` / `it` / `expect` / `vi`.
- Run tests from `packages/design-system/`: `npx vitest run src/components/DataTable/<file>`.
- New exported props, types and functions need JSDoc (Hard rule 7).
- No raw values in `.module.scss` (Hard rule 3). This plan adds no new SCSS values.
- No layout properties in component SCSS (Hard rule 4).
- `transform` may be set **only** on individual unpinned `<td>` / `<th>` elements. Never on `<tr>`, `<tbody>`, `<table>`, or any ancestor — a transformed ancestor establishes a containing block and breaks `position: sticky` on pinned cells.
- Pinned columns never move and must never receive a `transform`.
- Default is `dragWholeColumn = true`. The opt-out path (`false`) must stay covered by tests.
- Ships on the repo's normal automatic patch bump. Do **not** edit `BUMP` in `release.yml`.
- Before pushing: invoke the `pre-push-review` skill (variant A). Required by Hard rule 8.

### Two deliberate deviations from the spec

Both are refinements found while planning. Implement the plan, not the spec, where they differ:

1. **`translateX(...)`, not `translate3d(...)`.** `translate3d` forces GPU layer promotion; on a 100×3 table that is 300 permanent layers. `translateX` is still compositor-friendly while animating without permanent layerization.
2. **The transform style is applied only while a drag is active**, not on every render. A permanent `translateX(0px)` on every cell would establish a containing block on every cell for the entire life of the table, which would trap any `position: fixed` descendant a consumer renders in a cell. Gating costs exactly two body re-renders per drag (start and end) and zero during pointer movement — the "never re-renders during the drag" guarantee is preserved.

---

## File Structure

| File                                                | Responsibility                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DataTable/columnShift.ts`                          | **New.** Pure geometry: `computeColumnShifts`, `cssIdent`, `shiftVarName`. No DOM.            |
| `DataTable/columnShift.test.ts`                     | **New.** Unit tests for the above.                                                            |
| `DataTable/useColumnDragShift.ts`                   | **New.** `applyColumnShifts` (DOM writes) + `useColumnDragShift` hook (dnd-kit subscription). |
| `DataTable/useColumnDragShift.test.ts`              | **New.** Tests for `applyColumnShifts`.                                                       |
| `DataTable/DataTable.tsx`                           | Prop, ref merge, strategy swap, driver component mount, `dragActive` state.                   |
| `DataTable/BodyRow.tsx`                             | Static var transform on unpinned data cells while dragging.                                   |
| `DataTable/HeaderCell.tsx`                          | In whole-column mode read the same var instead of dnd-kit's transform.                        |
| `DataTable/DataTable.test.tsx`                      | Integration tests for both modes + the pinned-cell guard.                                     |
| `playground/src/pages/components/DataTableDemo.tsx` | Example with a live mode toggle.                                                              |
| `design-system/AGENTS.md`                           | One bullet in the DataTable TL;DR.                                                            |

---

### Task 1: Pure column-shift geometry

**Files:**

- Create: `packages/design-system/src/components/DataTable/columnShift.ts`
- Test: `packages/design-system/src/components/DataTable/columnShift.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `computeColumnShifts(args: ColumnShiftArgs): Record<string, number>`
  - `cssIdent(columnId: string): string`
  - `shiftVarName(columnId: string): string`
  - `interface ColumnShiftArgs { orderedIds: string[]; activeId: string; overId: string | null; widths: Record<string, number>; deltaX: number }`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/DataTable/columnShift.test.ts`:

```ts
import { computeColumnShifts, cssIdent, shiftVarName } from './columnShift';

const orderedIds = ['a', 'b', 'c', 'd'];
const widths = { a: 100, b: 120, c: 80, d: 60 };

describe('computeColumnShifts', () => {
  it('translates the active column by the pointer delta', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'b',
      widths,
      deltaX: 37,
    });
    expect(shifts.b).toBe(37);
  });

  it('shifts columns left by the active width when the active column moves right', () => {
    // b (120px wide) dragged rightwards onto d: c and d slide left by 120.
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'd',
      widths,
      deltaX: 200,
    });
    expect(shifts.b).toBe(200);
    expect(shifts.c).toBe(-120);
    expect(shifts.d).toBe(-120);
    expect(shifts.a).toBeUndefined();
  });

  it('shifts columns right by the active width when the active column moves left', () => {
    // d (60px wide) dragged leftwards onto b: b and c slide right by 60.
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'd',
      overId: 'b',
      widths,
      deltaX: -150,
    });
    expect(shifts.d).toBe(-150);
    expect(shifts.b).toBe(60);
    expect(shifts.c).toBe(60);
    expect(shifts.a).toBeUndefined();
  });

  it('shifts nothing but the active column when hovering itself', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'b',
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('shifts nothing but the active column when over is null', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: null,
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('returns an empty map for an unknown active id', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'zzz',
      overId: 'b',
      widths,
      deltaX: 10,
    });
    expect(shifts).toEqual({});
  });

  it('ignores an unknown over id', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'zzz',
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('treats a missing width as zero rather than NaN', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'c',
      widths: {},
      deltaX: 10,
    });
    expect(shifts.c).toBe(-0);
  });

  it('handles a single-column table', () => {
    const shifts = computeColumnShifts({
      orderedIds: ['only'],
      activeId: 'only',
      overId: 'only',
      widths: { only: 100 },
      deltaX: 5,
    });
    expect(shifts).toEqual({ only: 5 });
  });
});

describe('cssIdent', () => {
  it('passes through an already-safe id', () => {
    expect(cssIdent('name')).toMatch(/^name-[a-z0-9]+$/);
  });

  it('replaces characters invalid in a custom property name', () => {
    expect(cssIdent('user.first name')).toMatch(/^user_first_name-[a-z0-9]+$/);
  });

  it('is stable for the same input', () => {
    expect(cssIdent('a.b')).toBe(cssIdent('a.b'));
  });

  it('does not collide for ids that sanitize to the same string', () => {
    // "a.b" and "a b" both sanitize to "a_b" — the hash suffix must separate them.
    expect(cssIdent('a.b')).not.toBe(cssIdent('a b'));
  });

  it('handles unicode and leading digits', () => {
    expect(cssIdent('1名前')).toMatch(/^1__-[a-z0-9]+$/);
  });
});

describe('shiftVarName', () => {
  it('builds a --dt-shift- prefixed custom property name', () => {
    expect(shiftVarName('name')).toBe(`--dt-shift-${cssIdent('name')}`);
    expect(shiftVarName('name').startsWith('--dt-shift-')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/columnShift.test.ts`
Expected: FAIL — `Failed to resolve import "./columnShift"`.

- [ ] **Step 3: Write the implementation**

Create `packages/design-system/src/components/DataTable/columnShift.ts`:

```ts
/**
 * Pure geometry for the whole-column drag preview. No DOM access — everything
 * here is a plain function so the maths can be unit-tested without rendering
 * a table or simulating a pointer.
 */

/** Inputs describing one frame of an in-progress column drag. */
export interface ColumnShiftArgs {
  /** Unpinned, reorderable column ids in their current visual order. */
  orderedIds: string[];
  /** Id of the column being dragged. */
  activeId: string;
  /** Id of the column currently hovered, or `null` when over nothing. */
  overId: string | null;
  /** Rendered width per column id, in px. */
  widths: Record<string, number>;
  /** Pointer delta on the x axis since drag start, in px. */
  deltaX: number;
}

/**
 * Translation in px for each column that moves this frame, keyed by column id.
 * Columns absent from the result do not move — callers treat a missing key as
 * `0` rather than writing an explicit zero for every untouched column.
 *
 * The active column follows the pointer; every column between its origin and
 * the hovered column slides one active-column-width in the opposite direction,
 * opening the gap the active column will drop into.
 */
export function computeColumnShifts({
  orderedIds,
  activeId,
  overId,
  widths,
  deltaX,
}: ColumnShiftArgs): Record<string, number> {
  const shifts: Record<string, number> = {};

  const from = orderedIds.indexOf(activeId);
  if (from === -1) return shifts;

  shifts[activeId] = deltaX;

  if (overId == null || overId === activeId) return shifts;
  const to = orderedIds.indexOf(overId);
  if (to === -1) return shifts;

  // A missing width means the column has no tracked size yet; shifting by 0 is
  // wrong-but-harmless, whereas NaN would poison the CSS value.
  const activeWidth = widths[activeId] ?? 0;

  if (to > from) {
    // Active column travels right: everything it passed slides left to fill in.
    for (let i = from + 1; i <= to; i++) shifts[orderedIds[i]] = -activeWidth;
  } else {
    // Active column travels left: everything it passed slides right.
    for (let i = to; i < from; i++) shifts[orderedIds[i]] = activeWidth;
  }

  return shifts;
}

/**
 * Turn an arbitrary column id into a fragment that is legal inside a CSS
 * custom-property name. Column ids are consumer-supplied and routinely contain
 * dots, spaces, or non-ASCII text, none of which are safe to interpolate.
 *
 * Sanitizing alone would collide (`a.b` and `a b` both become `a_b`), so a
 * stable hash of the original id is appended.
 */
export function cssIdent(columnId: string): string {
  const safe = columnId.replace(/[^a-zA-Z0-9_-]/g, '_');
  // djb2-style rolling hash — deterministic, no crypto needed, collisions are
  // vanishingly unlikely across one table's column set.
  let hash = 0;
  for (let i = 0; i < columnId.length; i++) {
    hash = (hash * 31 + columnId.charCodeAt(i)) | 0;
  }
  return `${safe}-${(hash >>> 0).toString(36)}`;
}

/** Full custom-property name carrying a column's current drag offset. */
export function shiftVarName(columnId: string): string {
  return `--dt-shift-${cssIdent(columnId)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/columnShift.test.ts`
Expected: PASS, 15 tests.

If the `treats a missing width as zero` test fails with `expected -0 to be 0`, note that `-0 === 0` is true but `toBe` uses `Object.is`; the assertion above already expects `-0`. Leave the implementation alone.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/columnShift.ts packages/design-system/src/components/DataTable/columnShift.test.ts
git commit -m "feat(DataTable): pure column-shift geometry for whole-column drag"
```

---

### Task 2: DOM writer + dnd-kit subscription hook

**Files:**

- Create: `packages/design-system/src/components/DataTable/useColumnDragShift.ts`
- Test: `packages/design-system/src/components/DataTable/useColumnDragShift.test.ts`

**Interfaces:**

- Consumes: `computeColumnShifts`, `shiftVarName` from Task 1.
- Produces:
  - `applyColumnShifts(root: HTMLElement | null, shifts: Record<string, number>, previousIds: string[]): string[]`
  - `useColumnDragShift(args: ColumnDragShiftArgs): void`
  - `interface ColumnDragShiftArgs { rootRef: RefObject<HTMLElement | null>; enabled: boolean; orderedIds: string[]; widths: Record<string, number>; onDragActiveChange: (active: boolean) => void }`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/DataTable/useColumnDragShift.test.ts`:

```ts
import { applyColumnShifts } from './useColumnDragShift';
import { shiftVarName } from './columnShift';

describe('applyColumnShifts', () => {
  function makeRoot() {
    return document.createElement('table');
  }

  it('writes a px custom property per shifted column', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12, b: -30 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('-30px');
  });

  it('returns the ids it wrote so the next call can clear them', () => {
    const root = makeRoot();
    const written = applyColumnShifts(root, { a: 1, b: 2 }, []);
    expect(written.sort()).toEqual(['a', 'b']);
  });

  it('removes properties for columns that stopped shifting', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    applyColumnShifts(root, { a: 5 }, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('5px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
  });

  it('clears everything when handed an empty shift map', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    const written = applyColumnShifts(root, {}, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
    expect(written).toEqual([]);
  });

  it('is a no-op on a null root', () => {
    expect(() => applyColumnShifts(null, { a: 1 }, [])).not.toThrow();
    expect(applyColumnShifts(null, { a: 1 }, ['b'])).toEqual([]);
  });

  it('rounds sub-pixel offsets to avoid churning the style attribute', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12.4 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/useColumnDragShift.test.ts`
Expected: FAIL — `Failed to resolve import "./useColumnDragShift"`.

- [ ] **Step 3: Write the implementation**

Create `packages/design-system/src/components/DataTable/useColumnDragShift.ts`:

```ts
import { useRef, type RefObject } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { computeColumnShifts, shiftVarName } from './columnShift';

/**
 * Write one custom property per shifted column onto `root`, and remove the
 * properties for any column that shifted on the previous frame but not this
 * one. Returns the ids written, to be passed back as `previousIds` next frame.
 *
 * Custom properties are set on the table element, NOT a transform — a
 * transformed ancestor would establish a containing block and break
 * `position: sticky` on pinned cells. Variables inherit harmlessly.
 */
export function applyColumnShifts(
  root: HTMLElement | null,
  shifts: Record<string, number>,
  previousIds: string[],
): string[] {
  if (!root) return [];

  for (const id of previousIds) {
    if (!(id in shifts)) root.style.removeProperty(shiftVarName(id));
  }

  const written: string[] = [];
  for (const [id, px] of Object.entries(shifts)) {
    // Round: sub-pixel precision is invisible and would rewrite the style
    // attribute on every pointer event for no visual gain.
    root.style.setProperty(shiftVarName(id), `${Math.round(px)}px`);
    written.push(id);
  }
  return written;
}

/** Inputs for {@link useColumnDragShift}. */
export interface ColumnDragShiftArgs {
  /** The `<table>` element the custom properties are written to. */
  rootRef: RefObject<HTMLElement | null>;
  /** False when `dragWholeColumn` is off — the hook then does nothing. */
  enabled: boolean;
  /** Unpinned, reorderable column ids in current visual order. */
  orderedIds: string[];
  /** Rendered width per column id, px. */
  widths: Record<string, number>;
  /** Called once at drag start (true) and once at drag end/cancel (false). */
  onDragActiveChange: (active: boolean) => void;
}

/**
 * Subscribes to the surrounding `DndContext` and publishes per-column drag
 * offsets as CSS custom properties on the table element.
 *
 * MUST be called from a component rendered inside `<DndContext>`. Mount it in
 * a leaf that renders `null`, never in `DataTable` itself — `useDndMonitor`'s
 * callbacks fire on every pointer move, and keeping them in a leaf guarantees
 * the table body is never re-rendered mid-drag.
 */
export function useColumnDragShift({
  rootRef,
  enabled,
  orderedIds,
  widths,
  onDragActiveChange,
}: ColumnDragShiftArgs): void {
  const writtenRef = useRef<string[]>([]);

  const clear = () => {
    writtenRef.current = applyColumnShifts(rootRef.current, {}, writtenRef.current);
    onDragActiveChange(false);
  };

  useDndMonitor({
    onDragStart() {
      if (!enabled) return;
      onDragActiveChange(true);
    },
    onDragMove(event) {
      if (!enabled) return;
      const shifts = computeColumnShifts({
        orderedIds,
        activeId: String(event.active.id),
        overId: event.over ? String(event.over.id) : null,
        widths,
        deltaX: event.delta.x,
      });
      writtenRef.current = applyColumnShifts(rootRef.current, shifts, writtenRef.current);
    },
    onDragEnd() {
      if (!enabled) return;
      clear();
    },
    onDragCancel() {
      if (!enabled) return;
      clear();
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/useColumnDragShift.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DataTable/useColumnDragShift.ts packages/design-system/src/components/DataTable/useColumnDragShift.test.ts
git commit -m "feat(DataTable): CSS-variable writer + dnd-kit subscription for column shifts"
```

---

### Task 3: `dragWholeColumn` prop, threading, and body-cell transforms

**Files:**

- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx` (props interface ~line 31, `DataTableInner` destructuring ~line 138, `BodyRow` call sites ~lines 273 and 288)
- Modify: `packages/design-system/src/components/DataTable/BodyRow.tsx` (props interface ~line 10, data-cell map ~line 122)
- Test: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

**Interfaces:**

- Consumes: `shiftVarName` from Task 1.
- Produces:
  - `DataTableProps<T>.dragWholeColumn?: boolean` (default `true`)
  - `BodyRowProps<T>.dragWholeColumn?: boolean`, `BodyRowProps<T>.dragActive?: boolean`
- Task 4 consumes both `BodyRow` props and adds the `dragActive` state that feeds them. Until Task 4 lands, `dragActive` is always `false` and no cell carries a transform — that is expected and the tests below account for it.

- [ ] **Step 1: Write the failing test**

Append to `packages/design-system/src/components/DataTable/DataTable.test.tsx`, at the end of the file:

```ts
describe('<DataTable> — whole-column drag preview', () => {
  // The transform is applied only while a drag is active, so these tests drive
  // BodyRow's `dragActive` path through DataTable's own prop plumbing. jsdom
  // cannot run a real pointer drag (see the note at the top of this file), so
  // what is asserted here is the static wiring: which cells are eligible to
  // carry a shift variable, and which must never be.
  function PinnedHarness({ dragWholeColumn }: { dragWholeColumn?: boolean }) {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      defaultColumnPinning: { left: ['name'], right: [] },
    });
    return (
      <DataTable instance={instance} aria-label="Pinned" dragWholeColumn={dragWholeColumn} />
    );
  }

  it('defaults dragWholeColumn to true', () => {
    render(<Harness />);
    // The table element carries the mode as a data attribute so the mode is
    // observable without simulating a drag.
    expect(screen.getByRole('table')).toHaveAttribute('data-drag-whole-column', 'true');
  });

  it('reflects dragWholeColumn={false}', () => {
    const instance = null as never;
    void instance;
    render(<HarnessWithProps dragWholeColumn={false} />);
    expect(screen.getByRole('table')).not.toHaveAttribute('data-drag-whole-column');
  });

  it('never puts a transform on a pinned cell', () => {
    render(<PinnedHarness />);
    // 'name' is pinned left; its cells must carry sticky positioning and no
    // transform, because a transform would break position: sticky.
    const nameCells = screen.getAllByText(/Alpha|Bravo/);
    for (const cell of nameCells) {
      const td = cell.closest('td')!;
      expect(td.style.position).toBe('sticky');
      expect(td.style.transform).toBe('');
    }
  });

  it('never puts a transform on a row or body element', () => {
    render(<Harness />);
    const table = screen.getByRole('table');
    for (const el of table.querySelectorAll('tr, tbody, thead')) {
      expect((el as HTMLElement).style.transform).toBe('');
    }
  });
});
```

Also add this harness next to the existing `Harness` near the top of the file, after the `Harness` definition:

```tsx
function HarnessWithProps(props: { dragWholeColumn?: boolean }) {
  const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
  return <DataTable instance={instance} aria-label="Test" {...props} />;
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/DataTable.test.tsx -t "whole-column drag preview"`
Expected: FAIL — TypeScript rejects the unknown `dragWholeColumn` prop, and `data-drag-whole-column` is absent.

- [ ] **Step 3: Add the prop to `DataTableProps`**

In `DataTable.tsx`, inside `export interface DataTableProps<T>` (after the `caption` entry):

```ts
  /**
   * Drag the whole column while reordering, not just its header cell.
   *
   * Default `true` — the dragged column's body cells travel with its header,
   * and every column the drag displaces shifts its body cells too, so the
   * header row and the body never disagree mid-drag. Costs one CSS-variable
   * write per shifted column per frame; the cells move on the compositor, so
   * the table body is not re-rendered during pointer movement.
   *
   * Set `false` for the cheaper preview: only the dragged header cell follows
   * the pointer and the body stays put until drop. Worth it for very large
   * tables on low-end hardware, or to restore the previous behavior.
   *
   * Pinned columns never move under either setting — they are excluded from
   * reordering entirely.
   */
  dragWholeColumn?: boolean;
```

- [ ] **Step 4: Thread the prop through `DataTableInner`**

In `DataTable.tsx`, add to the destructuring in `DataTableInner` (after `caption,`):

```ts
    dragWholeColumn = true,
```

Then on the `<Table>` element, alongside the existing `aria-rowcount` attribute, add:

```tsx
          data-drag-whole-column={dragWholeColumn ? 'true' : undefined}
```

- [ ] **Step 5: Add the BodyRow props**

In `BodyRow.tsx`, extend the props interface:

```ts
export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
  /** When true, paint the row with the pinned-row background tint. */
  isPinnedRow?: boolean;
  /** Whole-column drag preview is enabled for this table. */
  dragWholeColumn?: boolean;
  /** A column drag is currently in progress. */
  dragActive?: boolean;
}
```

and the signature:

```ts
export function BodyRow<T>({
  row,
  instance,
  isPinnedRow,
  dragWholeColumn,
  dragActive,
}: BodyRowProps<T>) {
```

- [ ] **Step 6: Apply the transform to unpinned data cells**

In `BodyRow.tsx`, add this import at the top:

```ts
import { shiftVarName } from './columnShift';
```

Replace the data-cell map body (the `renderColumns.map((col) => { ... })` block) with:

```tsx
{
  renderColumns.map((col) => {
    const pin = getPinStyle(col.id, instance);
    // The shift variable is applied ONLY to unpinned cells, and only
    // while a drag is running. Two reasons this is not unconditional:
    //  - a transform on a pinned cell would break its position: sticky;
    //  - a permanent `translateX(0px)` on every cell would establish a
    //    containing block on every cell, trapping any position: fixed
    //    descendant a consumer renders inside one.
    const shifted = dragWholeColumn === true && dragActive === true && !pin.position;
    const cellStyle = pin.position
      ? { position: pin.position, left: pin.left, right: pin.right }
      : shifted
        ? { transform: `translateX(var(${shiftVarName(col.id)}, 0px))` }
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
  });
}
```

- [ ] **Step 7: Pass the props at both BodyRow call sites**

In `DataTable.tsx`, the pinned-rows `<BodyRow ... isPinnedRow />` and the main-body `<BodyRow ... />` both gain:

```tsx
dragWholeColumn = { dragWholeColumn };
dragActive = { dragActive };
```

`dragActive` does not exist yet — add a placeholder constant directly above the `return` in `DataTableInner` so this task compiles and its tests pass on their own:

```ts
// Replaced by real state in the next task.
const dragActive = false;
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/DataTable.test.tsx`
Expected: PASS — the whole existing DataTable suite plus the 4 new tests.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.tsx packages/design-system/src/components/DataTable/BodyRow.tsx packages/design-system/src/components/DataTable/DataTable.test.tsx
git commit -m "feat(DataTable): dragWholeColumn prop + body-cell shift transforms"
```

---

### Task 4: Wire the driver, the strategy swap, and the header

**Files:**

- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx` (imports, `DataTableInner`, the `SortableContext` element, the `<Table>` ref)
- Modify: `packages/design-system/src/components/DataTable/HeaderCell.tsx` (props interface ~line 20, `cellStyle` ~line 108)
- Test: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

**Interfaces:**

- Consumes: `useColumnDragShift` (Task 2), `shiftVarName` (Task 1), `BodyRowProps.dragActive` (Task 3).
- Produces: `HeaderCellProps<T>.dragWholeColumn?: boolean`, `HeaderCellProps<T>.dragActive?: boolean`.

- [ ] **Step 1: Write the failing test**

Append to the `describe('<DataTable> — whole-column drag preview', ...)` block in `DataTable.test.tsx`:

```ts
  it('exposes the table element to the shift driver via the forwarded ref', () => {
    function RefHarness() {
      const ref = useRef<HTMLTableElement>(null);
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return (
        <>
          <DataTable ref={ref} instance={instance} aria-label="Reffed" />
          <button onClick={() => ref.current?.setAttribute('data-ref-ok', 'yes')}>probe</button>
        </>
      );
    }
    render(<RefHarness />);
    screen.getByRole('button', { name: 'probe' }).click();
    // The consumer's ref must still reach the <table> after the internal
    // merge added for the shift driver.
    expect(screen.getByRole('table')).toHaveAttribute('data-ref-ok', 'yes');
  });
```

`useRef` is already imported at the top of this test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/DataTable.test.tsx -t "forwarded ref"`
Expected: PASS already (the ref is forwarded today). This test is a **regression guard** for the ref merge introduced in this task — it must keep passing after Step 3. Note the passing result and continue.

- [ ] **Step 3: Add the ref merge and the drag-active state**

In `DataTable.tsx`, extend the React import to include what is needed:

```ts
import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type Ref,
  type ReactNode,
} from 'react';
```

Keep any other existing named imports from `react` that are already there — add only the missing ones.

Inside `DataTableInner`, replace the placeholder `const dragActive = false;` from Task 3 with:

```ts
const [dragActive, setDragActive] = useState(false);

// The shift driver writes custom properties onto the <table> element, so we
// need our own handle on it while still honouring the consumer's ref.
const tableRef = useRef<HTMLTableElement | null>(null);
const setTableRef = useCallback(
  (node: HTMLTableElement | null) => {
    tableRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLTableElement | null }).current = node;
  },
  [ref],
);
```

Change the `<Table ref={ref} ...>` to:

```tsx
ref = { setTableRef };
```

- [ ] **Step 4: Add the driver component**

In `DataTable.tsx`, add the import:

```ts
import { useColumnDragShift } from './useColumnDragShift';
```

Add this component next to `DragFloatingProbe`:

```tsx
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
  rootRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  orderedIds: string[];
  widths: Record<string, number>;
  onDragActiveChange: (active: boolean) => void;
}) {
  useColumnDragShift({ rootRef, enabled, orderedIds, widths, onDragActiveChange });
  return null;
}
```

- [ ] **Step 5: Mount the driver and swap the strategy**

In `DataTable.tsx`, immediately after `<DragFloatingProbe />`:

```tsx
<ColumnShiftDriver
  rootRef={tableRef}
  enabled={dragWholeColumn}
  orderedIds={sortableIds}
  widths={instance.columnSizesPx}
  onDragActiveChange={setDragActive}
/>
```

Change the `SortableContext` strategy so dnd-kit stops moving the headers when we are moving them ourselves:

```tsx
      <SortableContext
        items={sortableIds}
        // In whole-column mode the shift variables are the single source of
        // truth for BOTH header and body, so dnd-kit's own per-item transform
        // must stand down — otherwise the two fight and the header desyncs
        // from the body it is supposed to be glued to.
        strategy={dragWholeColumn ? noopSortingStrategy : horizontalListSortingStrategy}
      >
```

And define the no-op strategy at module scope, next to the other helpers:

```ts
/** Sorting strategy that moves nothing — see the SortableContext comment. */
const noopSortingStrategy = () => null;
```

- [ ] **Step 6: Make the header read the same variable**

In `HeaderCell.tsx`, add the import:

```ts
import { shiftVarName } from './columnShift';
```

Extend the props interface:

```ts
export interface HeaderCellProps<T> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
  /** Whole-column drag preview is enabled for this table. */
  dragWholeColumn?: boolean;
  /** A column drag is currently in progress. */
  dragActive?: boolean;
}
```

and the signature:

```ts
export function HeaderCell<T>({
  column,
  instance,
  dragWholeColumn,
  dragActive,
}: HeaderCellProps<T>) {
```

Replace the `cellStyle` construction with:

```ts
// In whole-column mode the header rides the SAME custom property as its body
// cells, so the two cannot desync — that is the entire point of the feature.
// Pinned cells are excluded: a transform would break their position: sticky.
const useShiftVar = dragWholeColumn === true && dragActive === true && !isPinned;
const cellStyle = {
  transform: useShiftVar
    ? `translateX(var(${shiftVarName(column.id)}, 0px))`
    : CSS.Transform.toString(transform),
  transition: useShiftVar ? undefined : transition,
  ...stickyStyle,
};
```

- [ ] **Step 7: Pass the props to HeaderCell**

In `DataTable.tsx`, update the header map:

```tsx
{
  renderColumns.map((col) => (
    <HeaderCell
      key={col.id}
      column={col}
      instance={instance}
      dragWholeColumn={dragWholeColumn}
      dragActive={dragActive}
    />
  ));
}
```

- [ ] **Step 8: Run the full DataTable suite**

Run: `cd packages/design-system && npx vitest run src/components/DataTable/`
Expected: PASS — every existing test plus the new ones. If `horizontalListSortingStrategy` is now unused in the `dragWholeColumn` path, it must still be imported and referenced by the `false` branch; a TypeScript "unused import" error means Step 5 was applied incorrectly.

- [ ] **Step 9: Run the whole gate**

```bash
cd /home/dpws/projects/design-system
npm test && npm run typecheck && npx stylelint "packages/**/src/**/*.{css,scss}" && npm run build
```

Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add packages/design-system/src/components/DataTable/
git commit -m "feat(DataTable): drive header and body from one shift variable"
```

---

### Task 5: Demo, docs, and manual verification

**Files:**

- Modify: `packages/playground/src/pages/components/DataTableDemo.tsx`
- Modify: `packages/design-system/AGENTS.md` (the `<DataTable>` section, around line 2964)

**Interfaces:**

- Consumes: `DataTableProps.dragWholeColumn` from Task 3.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add a demo example with a live toggle**

In `DataTableDemo.tsx`, add a new `<Example>` following the file's existing pattern. Read a neighbouring `<Example>` in that file first and match its structure exactly — the `title` / `description` / `code` / children shape, and how it imports `Switch`.

The live preview must render a `<Switch>` bound to local state that flips `dragWholeColumn`, above a `<DataTable>` with enough columns to make reordering meaningful (reuse the demo's existing columns and rows). The `description` should state plainly that the default is `true`, that the toggle exists to compare, and that pinned columns never move either way.

- [ ] **Step 2: Verify both modes in a browser**

```bash
npm run dev -w playground -- --port 8095 --strictPort
```

Navigate to the DataTable demo. With the toggle **on**, drag a column by its grip and confirm the body cells travel with the header and displaced columns shift too. Flip the toggle **off** and confirm only the header moves. Then pin a column and confirm it never moves in either mode and its sticky offset is unaffected while another column is dragged.

Kill the dev server and any Playwright Chrome afterwards.

- [ ] **Step 3: Add the AGENTS.md line**

In the `<DataTable>` section, add one bullet in the same voice as its neighbours:

```markdown
- **`dragWholeColumn`** (default `true`): while a column is dragged to reorder, its body cells travel with its header and displaced columns shift their cells too, so the header row and body never disagree mid-drag. Offsets ride a CSS custom property on the table element, so pointer movement never re-renders the body. Set `false` for the cheaper preview where only the header cell moves. Pinned columns never move either way.
```

- [ ] **Step 4: Run the whole gate**

```bash
cd /home/dpws/projects/design-system
npm test && npm run typecheck && npx stylelint "packages/**/src/**/*.{css,scss}" && npm run build && npm pack --dry-run -w @eocrm/design-system | grep -c "\.test\."
```

Expected: all green; the final count is `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/DataTableDemo.tsx packages/design-system/AGENTS.md packages/playground/src/lib/props.manifest.json
git commit -m "docs(DataTable): whole-column drag demo + AGENTS entry"
```

- [ ] **Step 6: Pre-push review**

Invoke the `pre-push-review` skill (variant A) and follow it to completion. Do not push until a fresh reviewer says "clean enough to stop".

- [ ] **Step 7: Branch, push, PR**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/datatable-whole-column-drag
# (rebase the work onto the branch if it was committed on main)
git push -u origin feat/datatable-whole-column-drag
gh pr create --title "feat(DataTable): drag the whole column, not just the header"
```

The PR body must state that the default changed for every existing consumer, and name `dragWholeColumn={false}` as the opt-out. Do **not** edit `BUMP` in `release.yml` — this ships on the normal patch bump by decision.

---

## Self-Review

**Spec coverage**

| Spec requirement                                   | Task                                       |
| -------------------------------------------------- | ------------------------------------------ |
| `dragWholeColumn?: boolean`, default `true`        | 3                                          |
| Static var transform on unpinned body cells        | 3                                          |
| `useColumnDragShift` writes vars imperatively      | 2                                          |
| One write per shifted column per frame             | 2                                          |
| `cssIdent` for unsafe column ids                   | 1                                          |
| `computeColumnShifts` pure function + rules        | 1                                          |
| No-op strategy + header reads the same var         | 4                                          |
| `false` path leaves the historical behavior intact | 4 (Step 5 branch), tested in 3             |
| Pinned columns never shift / never transformed     | 3 (test), 3 Step 6, 4 Step 6               |
| Transform never on an ancestor                     | 3 (test), constraint in Global Constraints |
| Dragged column shares the existing opacity fade    | **Gap — see below**                        |
| Tests for both modes                               | 3, 4                                       |
| Demo with a live toggle                            | 5                                          |
| AGENTS.md entry                                    | 5                                          |
| Normal patch bump, no `BUMP` edit                  | 5 Step 7                                   |

**Gap found and closed:** the spec's "Visual treatment" section (the dragged column's body cells share `--data-table-header-dragging-opacity`) had no task. It is deliberately **dropped from this plan**, not forgotten: `.dragging` is applied from `isDragging` inside `HeaderCell`, and reaching the body cells with it would require plumbing the active column id into every row — a second cross-cutting channel alongside `dragActive`, for a fade. The motion alone already identifies the column being dragged. If it still reads as wanted after Task 5's manual check, it is a follow-up, and the manual check in Task 5 Step 2 is where that call gets made.

**Placeholder scan:** no TBDs. Task 5 Step 1 intentionally says "match the neighbouring `<Example>`" rather than inlining demo code, because that file's example shape is long and local to the playground; the step names exactly what the example must contain and where to look. Every library-code step contains literal code.

**Type consistency:** `shiftVarName(columnId: string)` is used identically in Tasks 2, 3, 4. `dragWholeColumn` / `dragActive` are the same two prop names on `BodyRowProps` and `HeaderCellProps`. `applyColumnShifts(root, shifts, previousIds)` returns `string[]` and is fed back as `previousIds` — consistent between its definition (Task 2) and its only caller (the hook, same file). The `dragActive` placeholder introduced in Task 3 Step 7 is explicitly replaced in Task 4 Step 3.
