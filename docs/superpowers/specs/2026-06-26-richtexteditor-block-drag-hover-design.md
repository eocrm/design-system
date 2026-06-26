# RichTextEditor block-controls drag & hover refinement — design

**Date:** 2026-06-26
**Status:** Approved (brainstorm) → ready for implementation plan
**Component:** `@eocrm/design-system` › `RichTextEditor`

---

## Context

The Notion-style block controls shipped in Slice 1 (`blockControls` prop; PR #208)
and were extended by the attachment work (Slices 2–3). Three rough edges surfaced in
use, all in the per-block gutter overlay:

1. **Drag feedback is thin.** Dragging the grip shows only a blue drop-indicator
   line (where the block will land). There is no representation of _what_ is being
   moved, so the drag feels disconnected — unlike Notion, which floats a copy of the
   block under the cursor.
2. **The gutter is hard to reach.** Hover is tracked by a `mouseover` listener on
   the editable only. The gutter is an absolutely-positioned **sibling** of the
   editable (it lives outside the contentEditable), so it is not part of the hover
   model: there is no hover bridge between a block and its controls, and the gutter
   never hides once shown. The lived result is "the controls disappear / I can't get
   to them" when moving from the block toward the gutter.
3. **The menu can be left open during a drag.** If the block menu is open and the
   user then grabs the grip to drag, the menu stays open over the moving block.

All three are refinements to the **existing** control layer. No engine, model, or
serialization change.

## Goal

Make block reordering feel natural (a real drag preview), make the gutter controls
reliably reachable (and hide when you leave the editor), and keep the block menu
from lingering during a drag.

## Scope

In scope (all within `RichTextBlockControls.tsx` + the hover effects and CSS used by
the block-controls layer):

- **A — Hover zone.** Replace the editable-only hover tracking with a model that
  spans the whole editor shell (editable + gutter), keeps the controls alive while
  the pointer is over them, and hides them when the pointer leaves the editor.
- **B — Drag preview.** Add a dnd-kit `<DragOverlay>` that floats a semi-transparent
  copy of the dragged block under the cursor; dim the source block; keep the blue
  drop-line.
- **C — Menu vs. drag.** Close the block menu when a drag starts.

Out of scope:

- Any change to the block model, engine transforms (`moveBlockUnitToIndex` et al.),
  serialization, or the set of block/menu actions.
- Drag-to-reorder by dragging the block body itself (the grip stays the only drag
  handle).
- Touch-specific drag affordances beyond what the existing `PointerSensor` provides.
- Keyboard reorder (already shipped: ⌘/Ctrl+⇧↑/↓) — unchanged.

---

## A — Hover zone

### Problem (root cause)

`RichTextEditor.tsx` sets the active block from a `mouseover` listener attached to
the editable root (`rootRef`). The gutter (`RichTextBlockControls`) is rendered as a
sibling of the editable inside `.shell` and absolutely positioned over the editable's
reserved left padding. Because the gutter is **not a descendant of the editable**,
moving the pointer onto it fires no `mouseover` on the editable — the active block is
driven purely by hovering block text. There is also no `mouseleave` handling, so the
gutter, once shown, never hides.

### Design

Track hover at the **shell** level (the shell wraps both the editable and the gutter)
and derive the active block from two independent sources:

- `hoverBlockId` — set on `mouseover` over the shell when the event target resolves
  to a block (`blockIdFromNode` walks up to a `[data-block-id]`). When the target
  does **not** resolve to a block (the gutter buttons, the editable's padding), the
  value is **left unchanged** — so reaching from a block onto its controls keeps them
  alive. Cleared on the shell's `mouseleave` (pointer truly leaves the editor).
- `caretBlockId` — the existing caret-driven block, set from `selectionchange` while
  the editor is focused (keyboard users / after the mouse leaves).

The rendered active block is the resolution:

```
activeBlockId = hoverBlockId ?? caretBlockId
```

Hover wins while the pointer is in the editor; when the pointer leaves, the gutter
falls back to the caret's block (if focused) or hides (if not). `Shift+F10` (open
menu) continues to operate on this resolved active block, so keyboard behavior is
unchanged.

### Why this shape

- It makes "block + its gutter" a single contiguous hover region without a literal
  bridge element: the gutter sits in the editable's reserved left padding, and
  `mouseover` over the gutter simply doesn't clear `hoverBlockId`.
- Splitting hover from caret keeps the keyboard/caret gutter target intact — clearing
  on `mouseleave` no longer wipes the keyboard user's controls, because the caret
  source still resolves.
- `mouseleave` on the shell (which does not fire when moving between descendants)
  gives a clean "left the editor" signal with no per-element bookkeeping.

### Behavior table

| Pointer location                   | `hoverBlockId` | Result                                                |
| ---------------------------------- | -------------- | ----------------------------------------------------- |
| Over block A's text                | A              | Gutter shows on A                                     |
| Move from A's text onto A's gutter | A (unchanged)  | Gutter stays on A                                     |
| Move from A to block B's text      | B              | Gutter moves to B                                     |
| Leave the editor entirely          | cleared        | Gutter hides, or falls back to caret block if focused |
| No mouse, caret in block C         | (null)         | Gutter shows on C via `caretBlockId`                  |

### Edge cases

- **Menu open:** the existing `blockMenuOpenRef` guard still suppresses hover-steal
  while the block menu is open, so the active block can't change out from under an
  open menu. `mouseleave` while the menu is open must **not** clear the active block
  (the menu's actions are bound to it) — `mouseleave` is gated on the same
  `blockMenuOpenRef`.
- **Drag in progress:** while a grip drag is active the active block must not change
  (it is the block being dragged). The drag lives in the child's `DndContext`
  (`RichTextBlockControls`) while hover tracking lives in the parent
  (`RichTextEditor`), so the child reports drag state up the same way it already
  reports menu-open state: a new `onDraggingChange?: (dragging: boolean) => void`
  prop, called in `onDragStart` (true) and `onDragEnd`/`onDragCancel` (false). The
  editor keeps a `draggingRef` in sync and the shell `mouseover`/`mouseleave`
  handlers early-return when it is set — exactly mirroring the existing
  `blockMenuOpenRef` guard.
- **`controlsOn` false:** when `blockControls` is off, no hover/caret tracking runs
  (unchanged from today).

---

## B — Drag preview

### Design

Wrap the existing grip drag in dnd-kit's `<DragOverlay>` (a child of the existing
`DndContext` in `RichTextBlockControls`):

- **On drag start** (`onDragStart`): snapshot the dragged block's rendered DOM —
  capture `outerHTML` and the element's `width` from
  `rootRef.current.querySelector([data-block-id="…"])` — into component state. Using
  a DOM snapshot (rather than re-rendering the block through `renderDoc`) means
  images, marks, mention chips, link/attachment widgets all look exactly like the
  live block, with no new rendering path and no need to thread the doc/renderers into
  the controls component.
- **Render** the overlay as a block-width container with the snapshot injected via
  `dangerouslySetInnerHTML`, styled as a semi-transparent "ghost" (reduced opacity,
  subtle elevation/cursor), `contentEditable={false}`. dnd-kit positions it under the
  cursor and animates the drop.
- **Dim the source block** while dragging: toggle a transient class on the live
  block element (`el.classList.add(styles.blockDragging)` on drag start, remove on
  drag end/cancel). This is a presentation-only DOM side-effect on an element React
  owns; it is always cleaned up on drag end and cancel, and the post-reorder
  re-render rebuilds the DOM regardless. (Alternative considered: drive the dim via a
  React data attribute through `renderDoc` — rejected as more invasive for a
  transient visual.)
- **Keep** the existing blue `.dropIndicator` line (where the block lands). The
  overlay shows _what_ moves; the line shows _where_ it goes.

### Snapshot safety

The injected HTML is the editor's **own** serialized block DOM (already in the live
document), not external/user-pasted HTML arriving fresh — it is the same markup
React just rendered. It is injected into a `contentEditable={false}`,
non-interactive, transient overlay that is removed on drop. No scripts execute from
`innerHTML` assignment. This is the standard dnd-kit overlay pattern; the snapshot is
discarded at drag end.

### Cleanup

`onDragEnd` and `onDragCancel` both: clear the snapshot state, remove the dim class
from the source element, and clear `dropGap`/`dropY` (existing). The existing
`onReorder(activeBlockId, gap)` call on drag end is unchanged.

---

## C — Menu vs. drag

The grip wraps the block-menu trigger; a sub-4px pointer interaction falls through to
the trigger (opens the menu on click / mouse-up), while a ≥4px move is intercepted by
the `PointerSensor` and becomes a drag. So the menu already opens on mouse-up, not
pointer-down. The only gap is the **already-open** case.

**Design:** add `onDragStart` on the `DndContext` that calls `onMenuOpenChange(false)`.
Starting a drag closes the block menu. (`onDragStart` also drives Part B's snapshot +
dim and Part A's `draggingRef`, so it is one handler doing all three.)

---

## Testing

Unit tests (`RichTextEditor.test.tsx` / `RichTextBlockControls.test.tsx`, jsdom +
Testing Library, matching existing patterns):

**A — Hover zone**

- Hovering a block shows the gutter on that block.
- Moving the pointer from a block onto the gutter (a `mouseover` whose target is a
  gutter button) keeps the gutter on that block (active block unchanged).
- `mouseleave` on the shell hides the gutter when the editor is not focused.
- With the caret in a block and the mouse outside, the gutter shows on the caret
  block (caret fallback).
- `mouseleave` does **not** hide the gutter while the block menu is open.

**B — Drag preview**

- On drag start, a drag-overlay node appears containing the dragged block's content,
  and the source block carries the dim class.
- On drag end and on drag cancel, the overlay is gone and the dim class is removed.
- Reorder still fires `onReorder`/commits `moveBlockUnitToIndex` with the correct gap
  (existing behavior, kept green).

**C — Menu vs. drag**

- With the block menu open, starting a drag closes it (`onMenuOpenChange(false)` /
  menu no longer in the document).
- A plain click on the grip still opens the menu (no regression).

(jsdom has no real layout/pointer drag; drag tests use dnd-kit's documented
test approach — dispatch the sensor's pointer sequence or invoke the
`onDragStart/Move/End` handlers as the existing reorder tests already do.)

**Live verification (Playwright, playground RichTextEditor demo "Block controls"):**
reproduce before/after — (1) reach from a block onto the gutter without the controls
vanishing, and gutter hides on leaving the editor; (2) drag a block and see the
floating ghost + dimmed source + drop line; (3) open the menu, start a drag, menu
closes.

## Files

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
  — `DragOverlay` + snapshot/dim state, `onDragStart` (snapshot, dim, close menu,
  report dragging via new `onDraggingChange` prop), cleanup in
  `onDragEnd`/`onDragCancel`; add the `onDraggingChange?: (dragging: boolean) => void`
  prop to `RichTextBlockControlsProps`.
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
  — shell-level hover tracking (`hoverBlockId` + `mouseleave`), split from
  `caretBlockId`, resolved `activeBlockId`; wire `onDraggingChange` → `draggingRef`
  and guard the hover handlers on it (mirrors `blockMenuOpenRef`).
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
  — `.dragOverlay` (ghost: opacity/elevation/cursor) and `.blockDragging` (source
  dim). Tokens only.
- Modify: tests beside the components (above).

No new dependency (dnd-kit already in use), no new exported API, no demo/manifest
change (behavioral refinement of an existing prop). The existing "Block controls"
demo already exercises the path; its description may get a one-line note about the
drag preview.

## Risks

- **Snapshot HTML injection** — mitigated: own serialized DOM, inert overlay,
  discarded on drop (see Snapshot safety).
- **Direct DOM class toggle for the dim** — mitigated: presentation-only, cleaned on
  end + cancel, re-render rebuilds DOM.
- **Hover/caret resolution regressions** (e.g. gutter flicker when the mouse leaves
  toward an open menu) — covered by the edge-case gating on `blockMenuOpenRef` and by
  the unit + Playwright checks.

Ship as a single PR; run the Rule 8 pre-push review loop before merge.
