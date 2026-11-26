# TreeView Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in reorder/reparent in `TreeView`'s list view, by pointer, touch and keyboard (DS-93).

**Architecture:** A pure `treeMove.ts` module computes move targets (keyboard directions and pointer hit zones) from the flattened rows `flatten(buildTree(...))` already produces. TreeView wires the keyboard shortcuts and a live region first, then a `@dnd-kit` layer (sensors, our own hit-testing, indicators, overlay, hover-to-expand, autoscroll).

**Tech Stack:** React 19 + TS, `@dnd-kit/core` (already a dependency), SCSS modules + component tokens, Vitest (Node `.test.ts` / jsdom `.test.tsx`), the library's i18n.

**Spec:** `docs/superpowers/specs/2026-11-26-treeview-move-design.md` (the binding source; it includes "Resolved details").

## Global Constraints

- New public API, verbatim: `onMove?: (move: TreeViewMove) => void; canDrop?: (id: string, targetParentId: string | null) => boolean;` and `interface TreeViewMove { id: string; parentId: string | null; index: number | null }`. Export `TreeViewMove` from `src/index.ts`.
- **Without `onMove`:** no drag, no shortcuts, no `aria-description`, no live region. Behaviour and DOM are unchanged: every existing TreeView test passes untouched.
- **`index`:** the final position among the new parent's loaded children after removal. `null` when the end is unknown: the parent is collapsed, loading, errored, or has an overflow row and the drop appends. A no-op move never fires `onMove`.
- **Refusals:** the node itself and its rendered descendants; pseudo-rows; then `canDrop`. Chart view ignores `onMove`.
- **Keys:** `(ctrlKey || metaKey) && shiftKey` + Arrow{Up,Down,Right,Left}, handled before `keyAction`, with `preventDefault`.
- **Package Hard rules:** tokens only; no layout properties (use the `touch-hit-area` mixin and logical properties); JSDoc on all exports; every string through i18n (en + ru); Rule 10 — the live region is rendered unconditionally (whenever `onMove` is set).

## Review Focus

- Same-parent reorder downward (A, B, C → move A after C) must give `index: 2`, not 3 → Task 1 test.
- Ctrl+Shift+→ onto a collapsed previous sibling → `index: null`, then `onExpandedChange(prev, true)` after `onMove` → Task 2 test.
- Dropping onto your own descendant, or dragging over pseudo-rows → no indicator, no `onMove` → Task 1 + Task 3 tests.
- A click or tap without movement still selects (activation constraints) → Task 3 test.
- Focus stays on the moved node after the app re-renders it under its new parent → Task 2 test.

---

### Task 1: `treeMove.ts`, the pure move maths

**Files:** Create `packages/design-system/src/components/TreeView/treeMove.ts` and `treeMove.test.ts` (Node).

**Interfaces — Produces:**

```ts
export interface TreeViewMove {
  id: string;
  parentId: string | null;
  index: number | null;
}
export type MoveDirection = 'up' | 'down' | 'indent' | 'outdent';
export type MoveRefusal = 'boundary' | 'refused';
/** Keyboard move of the node `id` within the visible rows `flat` (flatten(buildTree(...))). */
export function keyboardMove(
  flat: TreeItem[],
  id: string,
  dir: MoveDirection,
  canDrop?: (id: string, parentId: string | null) => boolean,
): { move: TreeViewMove; expand?: string } | { refusal: MoveRefusal };
export type DropZone = 'before' | 'inside' | 'after';
export interface DropTarget {
  move: TreeViewMove;
  indicator: { key: string; zone: DropZone; level: number };
}
/** Pointer target: the row under the pointer, the zone by y within it (top 25% before, bottom 25% after, else inside). */
export function dropTarget(
  flat: TreeItem[],
  activeId: string,
  overKey: string | null,
  zone: DropZone,
  canDrop?: (id: string, parentId: string | null) => boolean,
): DropTarget | null;
export function zoneAt(offsetY: number, height: number): DropZone;
```

`overKey === null` means below the last row, which is after the last root. `dropTarget` returns `null` for refusals and no-ops.

- [ ] **Step 1: Failing tests** (build `flat` with the existing `buildTree` + `flatten`):
  - `up`/`down` swaps among siblings and refuses at the ends with `boundary`;
  - `indent` → previous sibling's last child, giving `index` = its loaded child count when it's expanded and loaded, `null` when collapsed or loading, and `expand` set when it was collapsed; no previous sibling → `boundary`;
  - `outdent` → grandparent, right after the old parent; at root → `boundary`;
  - `canDrop` false → `refused`;
  - `zoneAt` thresholds;
  - `dropTarget` before / after / inside, including the same-parent downward adjustment, "after an expanded node with visible children" = index 0 inside it, inside a leaf = index 0, inside a collapsed node = `null`, a parent with an overflow row appending gives `null`, own/descendant/pseudo-row → `null`, a no-op → `null`, and `overKey` null → after the last root.
- [ ] **Step 2:** `cd packages/design-system && npx vitest run src/components/TreeView/treeMove.test.ts` → FAIL.
- [ ] **Step 3:** Implement. Use `TreeItem.parentId`, `level`, `posInSet`, `children` and `expanded`. Read sibling lists from the parent item's `children`, or from the root items for root level.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(tree-view): move maths (DS-93)`.

### Task 2: Keyboard moves, announcements and the public API

**Files:** Modify `TreeView.tsx`, `TreeView.test.tsx`, `treeModel.ts` (only if a type export is needed), `index.ts`, `src/index.ts`, and `src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `treeView.move*` keys).

**Interfaces — Consumes:** `keyboardMove`, `TreeViewMove` from Task 1.

- [ ] **Step 1: Failing jsdom tests:**
  - Each shortcut fires `onMove` with the Task 1 payload.
  - `indent` onto a collapsed sibling calls `onMove` and then `onExpandedChange(prev, true)`, in that order.
  - Boundary and refusal moves announce "Can't move further …" / "Can't move here" and don't call `onMove`.
  - After a successful move, the live region says e.g. "Setup moved into Intro, position 3 of 3", or "Setup moved into Intro." when the index is null.
  - With the moved node re-rendered by the test's controlled wrapper, focus stays on it.
  - The `aria-description` listing the shortcuts is present only with `onMove`; without `onMove` the shortcuts do nothing and no live region renders.
  - Plain arrows still navigate; chart view ignores the shortcuts.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Add the props with JSDoc (the per-prop text feeds the docs table), intercept the shortcuts in the item keydown before `keyAction`, add a polite live region, and re-focus the node by id after the move with a `useLayoutEffect` keyed on the pending id.
- [ ] **Step 4:** Run the TreeView tests, `npm run typecheck` and `make lint` → clean.
- [ ] **Step 5:** Commit `feat(tree-view): keyboard move with announcements (DS-93)`.

### Task 3: Pointer and touch drag

**Files:** Modify `TreeView.tsx`, `TreeView.module.scss`, `TreeView.tokens.scss` (indicator and drag tokens defaulting to accent), `TreeView.test.tsx`. Optionally create `useTreeDrag.ts` if TreeView.tsx would otherwise grow past ~150 lines of drag code.

**Interfaces — Consumes:** `dropTarget`, `zoneAt` from Task 1, and the live region from Task 2.

- [ ] **Step 1: Failing jsdom tests** where jsdom can drive them:
  - With `onMove`, rows are drag sources, and a click without movement still calls `onSelect`.
  - Simulated drag (dnd-kit sensors with mocked rects, as `Sortable`'s tests do; mirror their approach) to before/after/inside produces the right `onMove`.
  - A refused target shows no indicator element and does not call `onMove`.
  - Escape cancels and announces "Move cancelled."
  - Hover-to-expand calls `onExpandedChange(id, true)` after the delay (fake timers).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
  - Wrap the list view in `DndContext` with sensors `PointerSensor` `{ distance: 4 }` and `TouchSensor` `{ delay: 250, tolerance: 5 }`.
  - Use a custom collision step: the pointer's row via `useDroppable` per node row, plus `zoneAt` on the pointer y against that row's rect.
  - Render the indicator: an inline line at the row edge indented by level using logical properties, or the "inside" row style.
  - Use a `DragOverlay` with the row label, and dim the source and its descendants.
  - Hover-to-expand: a 700ms timer while over "inside" on a collapsed expandable node.
  - Autoscroll is scoped to the tree's scroll container.
  - Announcements use `_internal/dragAnnouncements`, or the same i18n pattern if those helpers don't fit.
- [ ] **Step 4:** Run the tests, `npm run typecheck`, `npx stylelint "packages/design-system/src/components/TreeView/*.scss"` and `make lint` → clean.
- [ ] **Step 5:** Commit `feat(tree-view): pointer and touch drag to move (DS-93)`.

### Task 4: Docs and demo

**Files:** `packages/design-system/docs/components/TreeView.md` and `packages/playground/src/pages/components/TreeViewDemo.tsx`.

- [ ] **Step 1:** Add a "Moving nodes (`onMove`)" docs section:
  - a canonical snippet that maps `onMove` to an API `{ parent_id, position }`, with `index: null` → append;
  - `canDrop` used for cycles and permissions;
  - a keyboard table;
  - the not-included items (chart, multi-select, cross-tree).
  - Run `npm run build:docs`.
- [ ] **Step 2:** Add a demo example: an in-memory editable tree (`useState` map of parent → children) applying `onMove`, with a `canDrop` that refuses one node to show refusal.
- [ ] **Step 3:** From the root run `make test && make lint && npm run format:check && npm run build -w @eocrm/design-system && npm run size -w @eocrm/design-system`. Every exit code must be 0. If size fails, raise only the bundle that grew, with small headroom.
- [ ] **Step 4:** Commit `docs(tree-view): move docs and demo (DS-93)`.
