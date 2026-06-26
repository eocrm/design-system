# RichTextEditor block drag → in-place sortable reflow — design

**Date:** 2026-06-26
**Status:** Approved (brainstorm) → ready for implementation plan
**Component:** `@eocrm/design-system` › `RichTextEditor`

---

## Context

The block-controls drag shipped in `v0.1.77` (PR #217) as a gutter-grip drag that
shows a floating `<DragOverlay>` clone following the cursor plus a thin blue
`.dropIndicator` line at the drop gap. This redesign replaces that visual model
with an **in-place sortable reflow**: the grabbed row lifts and moves within the
column under the pointer, the other rows slide apart to open its slot, and the
movement is clamped to the editor. No floating clone, no blue line. It should feel
like reordering a Linear/Things checklist.

Two user decisions are locked from the brainstorm:

1. **Drag feel — in-place reorder.** The lifted row itself moves within the column
   under the pointer (clamped to the editor); neighbors slide by the row's height to
   open the slot at the target and close it at the source. There is **no**
   cursor-following ghost and **no** blue drop-indicator line.
2. **Grab zone — the whole gutter strip.** The entire left controls column
   (＋ / ⚙ / ⠿), spanning the row's full height, becomes the drag handle: press
   anywhere on it and the whole row lifts. The ＋ / ⚙ / ⠿ buttons keep their click
   actions (a sub-threshold click still fires the button; a drag past the threshold
   lifts the row). The text body stays fully selectable — it is never a
   drag-initiator.

## Goal

Make block reordering feel native: grab the gutter, the row lifts and reflows in
place between the others, constrained to the editor, and drops into the opened slot.

## Approach (chosen)

**Manual transform reflow** — keep the existing `@dnd-kit/core` `DndContext` and
`useDraggable`; do NOT introduce `SortableContext`. On drag, apply transient inline
`transform: translateY(...)` to the live block elements: the grabbed unit follows
the pointer (clamped to the container), and the other rows shift by the unit's
height. On drop, clear the transforms and commit the existing subtree-aware
`moveBlockUnitToIndex`. This mirrors what dnd-kit's sortable strategy does
internally, but reuses our own geometry (`blockRects` + `gapIndexFromY`) so it stays
self-contained in the block-controls layer with **zero** changes to `renderDoc`
(shared with the read-only `RichText` viewer), the block model, or serialization.

Rejected: a real `@dnd-kit/sortable` `SortableContext` would require a `useSortable`
node per block _inside_ the `contentEditable`, threading refs/transforms through the
shared `renderDoc` and fighting nested `<ul><li>` units + caret/selection — high risk
for the same visual result.

## Scope

In scope (all within the block-controls drag layer):

- The gutter becomes a **full-row-height drag handle** (the whole strip, not just ⠿).
- **Remove** the `<DragOverlay>` floating clone, the `dragSnapshot` state, the
  `readBlockSnapshot` helper (+ its tests), and the `.dropIndicator` blue line.
- Add **transform-based reflow**: a pure geometry helper computes per-block
  `translateY` + the target gap from a start-of-drag snapshot and the pointer delta;
  the component applies the transforms and a "lifted" style to the grabbed unit.
- **Clamp** the lifted unit to the editor (the "restricted to container" requirement).
- Keep: the subtree-aware reorder commit (`moveBlockUnitToIndex`), the
  `onDraggingChange` → editor hover-guard wiring, close-menu-on-drag-start, the
  4px activation threshold (so clicks on ＋/⚙/⠿ still work).

Out of scope:

- Engine/model/serialization changes; `moveBlockUnitToIndex` and the reorder
  semantics are unchanged.
- Any change to `renderDoc` or the read-only `RichText` viewer.
- Keyboard reorder (already shipped: ⌘/Ctrl+⇧↑/↓) — unchanged.
- Dragging a block by its text body (text stays selection-only).

---

## A — The gutter as a full-row drag handle

Today the gutter (`RichTextBlockControls`) renders a small button row positioned at
the active block's vertical center, and `useDraggable` wraps only the ⠿ grip.

Change:

- The gutter container is measured to the **active block's full height** and
  positioned at the block's top (it already measures the block box for `top`; add
  `height`). Its width stays the reserved left column. The ＋ / ⚙ / ⠿ buttons are
  vertically centered within it.
- `useDraggable`'s `listeners` move from the ⠿ grip to the **gutter container** (the
  whole strip). As today, only `listeners` are spread — never dnd-kit's `attributes`
  (which would add the gutter to the tab order); keyboard reorder stays the editor
  shortcuts.
- The ＋ / ⚙ / ⠿ buttons keep their `onClick`. The PointerSensor's 4px activation
  constraint discriminates: a sub-4px press on a button fires its click (insert /
  configure / open menu); a press-drag past 4px anywhere on the gutter (including on
  a button) lifts the row. `onMouseDown={e => e.preventDefault()}` on the buttons is
  retained so a click never steals focus/caret.

Result: grab anywhere on the gutter to drag the whole row; the controls remain
clickable; text stays selectable.

## B — In-place reflow geometry

### Snapshot at drag start (measure once)

Because applying `transform` shifts an element's `getBoundingClientRect`, geometry
must be measured **once at drag start**, before any transform, and all subsequent
math derived from that snapshot + the pointer delta (this is also how dnd-kit
works). On `onDragStart` capture:

- `baseRects`: `blockRects(root)` — `{ top, height }` per `[data-block-id]` box,
  relative to the shell (the existing helper; already filters nothing special now
  that the overlay is gone).
- `unit`: the dragged unit's contiguous box-index range `[u0, u1]` derived from the
  active block via `blockUnitRange` (a list parent + its nested `<li>` boxes move as
  one unit). With `bottom(i) = baseRects[i].top + baseRects[i].height`,
  `unitHeight = bottom(u1) - baseRects[u0].top`.
- `bounds`: the clamp range for the lifted unit's `translateY` so the unit stays
  within the editor's block region — `minDy = baseRects[0].top - baseRects[u0].top`,
  `maxDy = bottom(n-1) - bottom(u1)`.

### Per-move computation (pure helper `blockReflow.ts`)

`computeReflow(baseRects, unit, rawDy)` → `{ liftDy, gap, shifts }`:

- `liftDy = clamp(rawDy, minDy, maxDy)` — the grabbed unit's translateY (clamped to
  container). `rawDy` is the pointer delta (`event.delta.y`).
- `gap`: the target insertion gap (0..N) in the **full** block array, computed from
  the lifted unit's current center (`unitCenter + liftDy`) against the _non-unit_
  box midpoints. This is the value handed to `moveBlockUnitToIndex` on drop, so it
  must match the existing reorder semantics (same result the shipped
  `gapIndexFromY`-based reorder produced).
- `shifts`: a `translateY` per non-unit box implementing the open-slot illusion:
  - a box originally **after** the unit that the unit's center has risen above
    (dragging down) shifts **up** by `unitHeight`;
  - a box originally **before** the unit that the center has dropped below (dragging
    up) shifts **down** by `unitHeight`;
  - otherwise `0`.
    Boxes within the unit get `liftDy` (they travel together).

The helper is pure (no DOM) and unit-tested across: drag down, drag up, clamp at top
and bottom, and a unit spanning multiple boxes (a list).

### Applying the transforms

On each `onDragMove`, the component sets inline `style.transform =
translateY(${px}px)` on each `[data-block-id]` element from `shifts`/`liftDy`, adds a
`.blockLifted` class to the unit's elements (elevation shadow + `position: relative`

- raised `z-index` so the lifted row paints above neighbors + `cursor: grabbing`),
  and tracks the touched elements for cleanup. A CSS `transition: transform` on the
  block elements (gated off under `prefers-reduced-motion`) gives the smooth slide;
  the lifted unit itself gets no transition (it must track the pointer 1:1).

### Drop / cancel / unmount

- `onDragEnd`: read `gap` from the last computed reflow (or recompute from
  `event.delta`), clear all transforms + the `.blockLifted` class, then commit
  `onReorder(draggedId, gap)` (→ `moveBlockUnitToIndex`). The model re-render
  rebuilds the DOM at the new order with no residual inline styles.
- `onDragCancel`: clear transforms + class; no reorder.
- Unmount mid-drag: the existing ref-based empty-deps cleanup clears the lifted
  class/transforms and reports `onDraggingChange(false)` (same pattern as today).

## C — Removed visuals

- `<DragOverlay>` + `dragSnapshot` state + `readBlockSnapshot` (and its unit tests)
  — deleted; the lifted live row replaces the floating clone.
- `.dropIndicator` blue line + `dropGap`/`dropY` state — deleted; the opened slot
  replaces it.
- `.dragOverlay` / `.blockDragging` SCSS — replaced by `.blockLifted` (+ a
  `transform`-transition rule on block elements, reduced-motion-gated).

## Testing

Unit (Vitest/jsdom, matching existing patterns):

- **`blockReflow.computeReflow`** (the pure core): drag-down shifts the passed rows
  up + correct `gap`; drag-up shifts down; `liftDy` clamps at top and bottom bounds;
  a multi-box unit (list) travels together and neighbors shift by the full unit
  height. This is the high-value coverage.
- **At-rest invariant**: no `[data-block-id]` element carries a transform or the
  `.blockLifted` class when not dragging.
- **Gutter is the drag handle**: the gutter container carries the dnd-kit drag
  listeners; ＋ / ⚙ / ⠿ clicks still fire their actions (no drag on a plain click).
- **Reorder commit**: dropping still calls `onReorder` / `moveBlockUnitToIndex` with
  the correct gap (kept green from the existing suite).

The live drag (real pointer reflow, clamping, slide) is **not** drivable in jsdom —
dnd-kit's PointerSensor needs real layout/pointer-capture (same limitation the
`Sortable` component documents and the shipped drag noted). It is verified manually
in the playground with Playwright (before/after): grab the gutter anywhere → the row
lifts with elevation and follows the pointer, neighbors part to open the slot, the
lifted row can't leave the editor, and dropping lands it in the opened slot; ＋/⚙/⠿
clicks and text selection still work.

## Files

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
  — gutter = full-height draggable handle; remove DragOverlay/snapshot/dropIndicator;
  snapshot baseRects+unit+bounds on drag start; apply transforms via the helper on
  drag move; clear+commit on end/cancel; unmount cleanup (kept).
- Create: `packages/design-system/src/components/RichTextEditor/blockReflow.ts`
  — pure `computeReflow` (+ any small geometry types). Reuses or complements
  `blockDrop.ts`'s `gapIndexFromY` for the gap.
- Create: `packages/design-system/src/components/RichTextEditor/blockReflow.test.ts`.
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`
  — drop the `readBlockSnapshot` tests; add gutter-handle + at-rest-no-transform tests.
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
  — `.gutter` full-row height; `.blockLifted`; block-element `transform` transition
  (reduced-motion-gated); remove `.dragOverlay` / `.blockDragging` / `.dropIndicator`.
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
  — pass the active block's measured height to the gutter if needed; `onDraggingChange`
  wiring unchanged.
- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
  — update the "Block controls" demo note to describe the in-place reflow.

No new dependency (dnd-kit already used), no new public API, no manifest change
(behavioral refinement of an existing prop). Tokens-only SCSS; `transform`/`z-index`
on the lifted row are the overlay's own anchoring (the same Rule-4 overlay precedent
as `.gutter`/`.dropIndicator`).

## Risks

- **Transient transforms on `contentEditable` children** — applied only during a
  pointer drag (no editing then), cleared on end/cancel/unmount, and wiped by the
  post-reorder re-render. Selection/caret untouched by transforms.
- **Measure-once correctness** — all geometry derives from the drag-start snapshot,
  never from transformed DOM, avoiding feedback loops.
- **Nested-list units** — the unit spans multiple boxes; they lift together and
  neighbors shift by the full unit height. Covered by a `computeReflow` test.
- **Gap parity** — the new `gap` must reproduce the shipped reorder result; the
  reorder commit + its tests stay green to guard this.
- **No jsdom drag coverage** — mitigated by the pure-helper unit tests + Playwright
  live verification.

Ship as a single PR; run the Rule 8 pre-push review loop before merge.
