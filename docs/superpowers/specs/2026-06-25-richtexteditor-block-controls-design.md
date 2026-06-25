# RichTextEditor block controls (Notion-style) — design

**Date:** 2026-06-25
**Status:** Approved (brainstorm) → ready for implementation plan
**Component:** `@eocrm/design-system` › `RichTextEditor`
**Slice:** 1 of 3

---

## Context — the larger effort

This spec covers **Slice 1** of a three-slice effort that grew out of a request to
add file upload to `RichTextEditor`. During brainstorming the scope expanded to a
Notion-style block experience, which is genuinely three features. They will ship as
three independent spec → plan → PR cycles, in this order:

1. **Block control layer (this spec).** Per-block gutter controls (`＋` insert, `⠿`
   drag/menu), a block actions menu (turn into / duplicate / move / delete), and
   subtree-aware drag-to-reorder — built on the **existing** block types.
2. **File upload + attachment blocks.** Void image/file **block** types + their
   selection/caret/delete + serialization; toolbar button + clipboard-file paste →
   consumer-provided upload handler → **inline loader** (a transient node, no full
   placeholder) → block. Attachment blocks inherit Slice 1's controls automatically.
3. **Attachment config.** Alt text, alignment, replace, open/download — surfaced
   through Slice 1's block menu.

**Cross-slice decisions already locked** (recorded here so later slices keep
continuity):

- Uploaded files are represented as **block-level nodes**, not inline marks — so
  they are first-class blocks that the Slice 1 controls can drag/configure/delete,
  consistent with the Notion model.
- Upload feedback is a **minimal inline loader** at the insertion point (not a
  toolbar indicator — `toolbar` defaults off and the CRM composer does not use it;
  not a full image-sized placeholder). The editor will signal "upload in flight" so
  the consumer can disable submit while a file is uploading.

Slices 2 and 3 are **out of scope** for this spec.

---

## Goal

Give `RichTextEditor` an opt-in, keyboard-accessible per-block control layer so a
user can insert, reorder (including nested lists), convert, duplicate, and delete
blocks directly — the structural-editing foundation every later slice builds on.

## Scope (Slice 1)

In scope:

- A new opt-in prop `blockControls?: boolean` (default `false`).
- A left **gutter overlay** that reveals two controls on the hovered/focused block:
  - `＋` — insert an empty paragraph below the block.
  - `⠿` — drag handle (reorder) **and** click target that opens the block menu.
- A **block menu** (built on the existing `DropdownMenu`) with:
  - **Turn into ▸** submenu: Text (paragraph), Heading 1/2/3, Bulleted list,
    Numbered list, Quote, Code.
  - **Duplicate** (⌘/Ctrl+D)
  - **Move up** (⌘/Ctrl+⇧↑) · **Move down** (⌘/Ctrl+⇧↓)
  - **Delete**
- **Subtree-aware** reorder/duplicate/delete: a list item carries its descendant
  run (following items at greater effective depth) as one unit.
- **Drag-to-reorder** by pointer (dnd-kit core — an allowed dependency).
- A standards-based **keyboard model** (see below).
- New pure engine transforms: `blockUnit` (range helper), `moveBlockUnit`,
  `duplicateBlockUnit`, `removeBlockUnit`; reuse existing `setBlockType` /
  list toggles for "turn into".

Out of scope (Slice 1):

- Attachment/image blocks and upload (Slice 2). Block controls are written so a
  void block "just works" as a unit, but no void-block rendering ships here.
- Per-block color/background (YAGNI).
- Multi-block selection / multi-drag. One block unit at a time.
- A standalone exported "block menu" component. The menu is internal to
  `RichTextEditor`.

## Non-goals / guardrails

- No change to default behavior: with `blockControls` unset, `RichTextEditor`
  renders and behaves exactly as today.
- Honors `readOnly`: when `readOnly`, no gutter, no menu, no drag.
- Obeys CLAUDE.md Rule 4: the editor root may use `position: relative` (allowed
  internal-anchor exception) + left padding for the gutter; **no** `margin` or
  external layout properties.

---

## Public API

```ts
export interface RichTextEditorProps {
  // …existing…
  /**
   * Show Notion-style per-block controls: a hover/focus gutter with an insert
   * (`＋`) button and a drag handle (`⠿`) that reorders blocks and opens a block
   * menu (turn into / duplicate / move / delete). Reordering is subtree-aware for
   * nested lists. Keyboard: Shift+F10 / ContextMenu opens the focused block's
   * menu; ⌘/Ctrl+⇧↑/↓ move it; ⌘/Ctrl+D duplicates. Default `false`. Ignored when
   * `readOnly`.
   */
  blockControls?: boolean;
}
```

No new public callbacks. All mutations route through the existing controlled
`value` / `onChange` round-trip and the editor's internal `commit()` (so block
operations are undoable like every other edit).

---

## Interaction design

### Mouse

- Hovering a block reveals its gutter (`＋`, `⠿`). The gutter aligns vertically to
  the block's box; it sits in the editor's left padding, **outside** the
  `contentEditable` (so it is never editable/selectable content).
- `＋` → insert an empty paragraph directly below the hovered block; place the
  caret in it.
- `⠿` click → open the block menu, anchored to the handle.
- `⠿` drag → reorder (see Drag-and-drop).

### Keyboard (caret inside a block)

- **Shift+F10 / ContextMenu key** → open the current block's menu, anchored to the
  caret. The menu is `DropdownMenu`, already arrow/Home/End/Esc/Enter accessible.
- **⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓** → move the block unit up/down by one sibling unit.
- **⌘/Ctrl+D** → duplicate the block unit (caret lands in the copy).
- **Enter** already inserts a block (normal split); there is no extra insert
  shortcut. Block **Delete** is menu-only — Backspace/Delete keep editing text.
- The gutter buttons are real `<button>`s with i18n `aria-label`s but
  `tabindex={-1}`, so a long document does not add one tab stop per block. The
  keyboard path is Shift+F10 + the shortcuts above.

### Menu → engine mapping

| Menu item        | Engine call                                              |
| ---------------- | ------------------------------------------------------- |
| Turn into: Text  | `setBlockType(doc, id, { type: 'paragraph' })`          |
| Turn into: H1–3  | `setBlockType(doc, id, { type: 'heading', level })`     |
| Turn into: lists | existing list toggle (`runToggleList`) semantics        |
| Turn into: Quote | `setBlockType(doc, id, { type: 'blockquote' })`          |
| Turn into: Code  | `setBlockType(doc, id, { type: 'code_block' })`          |
| Duplicate        | `duplicateBlockUnit(doc, id)`                            |
| Move up / down   | `moveBlockUnit(doc, id, -1 | +1)`                        |
| Delete           | `removeBlockUnit(doc, id)`                               |

"Turn into" acts on the single anchor block (matching the existing toolbar
block-type behavior); it does not rewrite a whole subtree.

---

## Engine changes (pure, immutable, tested in isolation)

New file `RichText/engine/blockUnit.ts` (or fold into `transforms.ts`):

- **`blockUnitRange(blocks, index): { start: number; end: number }`** — the
  half-open index range of the "unit" anchored at `index`. For a non-list block,
  `{ index, index+1 }`. For a list item at effective depth `d`, extend through the
  maximal contiguous run of following list items whose effective depth `> d`
  (computed via `effectiveDepths` + `isListItem`). This is the descendant run.

Transforms returning `{ doc, selection }` (consistent with the existing transform
contract):

- **`moveBlockUnit(doc, blockId, dir: -1 | 1)`** — find the unit; find the adjacent
  **sibling unit** in `dir` (skipping over a sibling's whole subtree); splice the
  moving unit to the other side. No-op at the document edges. Depth handling: the
  unit keeps its internal relative depths; the unit's top block clamps to a depth
  valid for its new neighbor (`[0, prevSiblingEffectiveDepth + 1]`), descendants
  shift by the same delta. `effectiveDepths` normalizes any residual gap at render.
- **`duplicateBlockUnit(doc, blockId)`** — clone the unit's blocks with fresh ids
  (`nextId()`), insert immediately after the unit; caret to the start of the clone.
- **`removeBlockUnit(doc, blockId)`** — delete the unit's blocks. If that empties
  the document, leave a single empty paragraph (mirror `emptyDoc()`); caret to the
  nearest surviving block (next, else previous).

`setBlockType` and the list-toggle command already exist and are reused as-is.

All four are pure and get a dedicated `*.test.ts` covering: plain blocks, a list
item with/without children, units at the first/last position, single-block doc,
and depth clamping on drop.

---

## Component structure

- **`RichTextBlockGutter.tsx`** (new, internal) — the overlay layer. Given the
  editor root ref and the doc, it renders, for the active (hovered/focused) block,
  the `＋` and `⠿` buttons positioned at that block's box (measured from the block
  element's `getBoundingClientRect()` relative to the root). Hidden when none
  active or `readOnly`.
- **`RichTextBlockMenu.tsx`** (new, internal) — wraps `DropdownMenu` with the
  fixed action set + the "Turn into" submenu; takes the target `blockId` and
  callbacks that dispatch the engine transforms through the editor's `commit()`.
- **`RichTextEditor.tsx`** (modified) — when `blockControls && !readOnly`:
  - track the **active block** (block under the pointer; and the block containing
    the caret via the existing `selectionchange` subscription);
  - render the gutter + menu next to the existing editable / link bubble / mention
    menu fragments;
  - add the keyboard handlers (Shift+F10, ⌘⇧↑/↓, ⌘D) in `onKeyDown`, routing to the
    new transforms via `commit()`;
  - wrap (only when enabled) the editable in the dnd context for reorder.
- **`RichTextEditor.module.scss`** (modified) — gutter/overlay styles (tokens
  only), editor left-padding to reserve gutter space, `position: relative` anchor.

The engine's `renderDoc` already stamps `data-block-id` on every block element in
editable mode, which the gutter uses to locate block boxes — **no renderDoc change
needed** for Slice 1.

## Drag-and-drop

Blocks render inside a single `contentEditable`, so each block is not an
independent React component we can hang `useSortable` on. Approach:

- Use **dnd-kit core** (`@dnd-kit/core`, allowed) with the `⠿` handle as the
  draggable. Compute the **drop index** from the pointer's Y against block boxes
  (`data-block-id` rects). Render a drop indicator line between blocks.
- On drop, translate (fromUnit, toIndex) into a `moveBlockUnit`-style splice and
  `commit()` once (one undo step).
- Evaluate the existing `<Sortable>` wrapper first; if the single-contentEditable
  root prevents per-item sortable nodes, fall back to dnd-kit core with the
  geometry-based drop calc above. Keyboard reorder is served by ⌘⇧↑/↓ (the
  dnd-kit keyboard sensor is optional parity, not required for a11y here).
- Disable native `draggable` text behavior conflicts: dragging starts only from
  the handle, never from selected text.

## Focus & selection management

- After insert/duplicate/move/turn-into/delete, set `pendingSelectionRef` so the
  existing `useLayoutEffect` restores the caret to the right block after re-render
  (same mechanism every current transform uses).
- Opening the menu does not move the model caret; closing returns focus to the
  editable.

## Edge cases

- Move up/down at the document edge → no-op (no commit, no history entry).
- Turn into / delete inside a list correctly handle the subtree via the unit
  helpers; `effectiveDepths` keeps rendering gap-free.
- Empty document after delete → one empty paragraph remains.
- `readOnly` → controls fully suppressed.
- Code blocks and quotes are plain non-list units (range is the single block).

---

## i18n (new keys; values in both `en.ts` and `ru.ts`)

- `richTextEditor.blockInsert` — `＋` aria-label ("Insert block below")
- `richTextEditor.blockActions` — `⠿` aria-label ("Block actions")
- `richTextEditor.blockMenu.turnInto` (+ option labels: text, heading1/2/3,
  bulletList, numberedList, quote, code)
- `richTextEditor.blockMenu.duplicate`
- `richTextEditor.blockMenu.moveUp`
- `richTextEditor.blockMenu.moveDown`
- `richTextEditor.blockMenu.delete`

---

## Testing

Engine (pure): dedicated tests for `blockUnitRange`, `moveBlockUnit`,
`duplicateBlockUnit`, `removeBlockUnit` (cases listed above).

Component (`RichTextEditor.test.tsx` additions):

- `blockControls` off → no gutter/menu in the DOM (default-behavior guard).
- Gutter appears for the focused block; buttons carry the i18n aria-labels and are
  `tabindex=-1`.
- `＋` inserts an empty paragraph below and moves the caret into it.
- Menu opens via click and via Shift+F10; arrow/Esc work (DropdownMenu).
- Turn into → block type changes; Duplicate → clone after the unit; Move up/down →
  reorder (incl. a nested list unit moving with its children); Delete → unit gone.
- ⌘⇧↑/↓, ⌘D shortcuts fire the same transforms; each is a single undo step.
- `readOnly` → no controls.

## Definition of done (design-system checklist)

- [ ] Engine transforms + tests (Rule 1)
- [ ] `RichTextEditor` wiring + component tests (Rule 1)
- [ ] All new strings via i18n in `en.ts` + `ru.ts` (Rule 9)
- [ ] JSDoc on the new `blockControls` prop + `@remarks` anti-patterns (Rule 7)
- [ ] Tokens only in SCSS; no forbidden layout props (Rules 3, 4)
- [ ] Playground demo updated to show `blockControls` (Rule 2) — extend
      `RichTextEditorDemo.tsx`; no new route needed (same component)
- [ ] `AGENTS.md` TL;DR updated for the new prop
- [ ] Manifest unchanged (no new component/cluster) — confirm during plan
- [ ] Pre-push review-fix loop (Rule 8); gates green; `npm pack --dry-run` clean

## Future (later slices, not built here)

- Slice 2: void attachment blocks + upload + inline loader + busy signal.
- Slice 3: attachment config via the block menu (alt text, align, replace,
  open/download).
