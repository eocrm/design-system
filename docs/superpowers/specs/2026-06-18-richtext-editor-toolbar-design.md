# RichTextEditor — toolbar + commands (Slice 3) — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming)
**Package:** `@eocrm/design-system`
**Builds on:** the editable-core editor (Slice 2, shipped `@eocrm/design-system@0.1.48`) — `docs/superpowers/specs/2026-06-18-richtext-editor-editable-core-design.md`

## Goal

Make formatting discoverable and unlock the block types the model already supports: a **built-in, opt-in toolbar** on `<RichTextEditor>` with mark buttons (bold/italic/underline/strike), a block-type menu (paragraph / H1–H3 / blockquote / code block), and bullet/ordered list toggles — plus the input behaviors that make lists usable (Enter-exits-empty-item, Tab/⇧Tab indent/outdent) and **collapsed-caret pending marks** so the mark buttons work with just a caret. No new engine transforms — every command is a composition of the existing ones.

## Architecture

The editor stays controlled (model = source of truth). Three additions:

1. **Reactive selection tracking.** A `selectionchange` listener (active while the editor is focused) reads the current model `Range` into React state. The toolbar needs the selection _reactively_ (to highlight active formats); Slice 2 only read it on-demand per input.
2. **Commands layer** (`commands.ts`, pure) — derives active state from `(doc, range)` and maps toolbar actions to engine transforms.
3. **Built-in toolbar** (`RichTextToolbar.tsx`, internal) rendered when `toolbar` is set; dispatches through the **same commit path** the keyboard uses (apply transform → re-render → restore selection).

Plus list-input key handling and pending-marks state on the editor.

## Modules

```
src/components/RichTextEditor/
  commands.ts            ← pure: active-state derivation + command runners
  commands.test.ts
  RichTextToolbar.tsx    ← internal toolbar UI (presentational)
  RichTextToolbar.test.tsx
  icons.tsx              ← small inline SVG icons (the library ships no icon dep)
  RichTextEditor.tsx     ← (modify) selection-state tracking, render toolbar, list keys, pending marks
```

`RichTextToolbar` + `icons.tsx` live **inside** `RichTextEditor/` — internal, not a new public component (no manifest entry of their own, no four-file-rule trigger). The only public-API change is the new `toolbar` prop on `RichTextEditor`.

### `commands.ts` (pure)

Active-state derivation:

```ts
activeMarks(doc: RichDoc, range: Range, pending: Mark[] | null): MarkType[]
  // non-collapsed: mark types present on EVERY character of the selection (intersection)
  // collapsed: `pending` marks if non-null, else the marks at the caret (char before)
currentBlock(doc: RichDoc, range: Range): { type: BlockType; level?: 1 | 2 | 3 } | null
  // the type (+ heading level) of all blocks the selection touches; null if mixed
```

Command runners, each `(doc, range, …) → { doc: RichDoc; selection: Range }`:

```ts
runToggleMark(doc, range, mark): { doc, selection }            // = toggleMark
runSetBlock(doc, range, patch): { doc, selection }             // setBlockType on EACH block in the selection
runToggleList(doc, range, listType): { doc, selection }        // all-already-listType → 'paragraph'; else → listType, depth 0
runIndent(doc, range, dir: 'in' | 'out'): { doc, selection }   // list items in range: depth ±1, clamped to ≥0
```

- `runSetBlock` over a multi-block selection applies `setBlockType` to every block, preserving the selection.
- `runToggleList`: if every selected block is already `listType`, convert them to `paragraph` (drop depth); else set them to `listType` at `depth: 0`.
- These compose `setBlockType` / `toggleMark` from the engine — no new transforms.

### `RichTextToolbar.tsx` (internal, presentational)

```ts
interface RichTextToolbarProps {
  activeMarks: MarkType[];
  block: { type: BlockType; level?: 1 | 2 | 3 } | null;
  disabled?: boolean;
  onToggleMark: (type: MarkType) => void;
  onSetBlock: (patch: { type: BlockType; level?: 1 | 2 | 3 }) => void;
  onToggleList: (listType: 'bullet_item' | 'ordered_item') => void;
}
```

- `role="toolbar"`, `aria-label` (i18n `richTextEditor.toolbar`).
- **Block-type `DropdownMenu`**: trigger label = current type ("Paragraph" / "Heading 1–3" / "Blockquote" / "Code block", `null` → "Mixed"); items call `onSetBlock` ({type:'paragraph'} | {type:'heading',level} | {type:'blockquote'} | {type:'code_block'}).
- **Mark `ButtonGroup`**: B / I / U / S icon `Button`s; `aria-pressed` from `activeMarks`; click → `onToggleMark`.
- **List `ButtonGroup`**: bullet / ordered icon `Button`s; `aria-pressed` when `block.type` matches; click → `onToggleList`.
- All disabled when `disabled` (editor `readOnly`).
- Built from `Button` (icon-only, `aria-label`) + `ButtonGroup` + `DropdownMenu` — so `RichTextEditor` now also **composes** Button/ButtonGroup/DropdownMenu (manifest regen reflects it).

### `icons.tsx`

Small inline SVG components (`BoldIcon`, `ItalicIcon`, `UnderlineIcon`, `StrikeIcon`, `BulletListIcon`, `OrderedListIcon`) sized via `1em`/`currentColor` so they inherit the Button's text color/size. The library ships no icon dependency (lucide is playground-only), so these are hand-authored, minimal, `aria-hidden`.

### `RichTextEditor.tsx` (modifications)

- **Selection state**: a `selectionchange` document listener (added on focus, removed on blur) → `setSelection(readSelection(root))`. Derive `activeMarks`/`currentBlock` from `{value, selection, pendingMarks}` for the toolbar.
- **`toolbar?: boolean`** prop (default `false`). When true, render `<RichTextToolbar>` above the surface, wired to command runners via the existing `commit` path. New prop on `RichTextEditorProps`.
- **Pending marks**: `pendingMarks` state (a `Mark[]` or `null`). Toggling a mark (button or ⌘B) with a **collapsed** selection updates `pendingMarks` (toggle that mark in the overlay) instead of a no-op. The next `insertText` while `pendingMarks` is set applies them to the inserted text (insert, then `applyMark` the inserted span for each pending mark). `pendingMarks` clears when the selection moves to a different point (a `selectionchange` not caused by our own insert) or on any structural edit. The mark buttons / shortcut reflect `pendingMarks` in their active state.
- **List keys** (in the existing keydown handler, before `applyShortcut`):
  - **Enter** when the caret is in an _empty_ list item (`bullet_item`/`ordered_item`, length 0): `preventDefault`; `setBlockType(blockId, { type: 'paragraph' })` (drop `depth`) — exits the list.
  - **Tab** in a list item: `preventDefault`; `runIndent(dir:'in')`. **⇧Tab** in a list item: `preventDefault`; `runIndent(dir:'out')`. Outside a list item, Tab is **not** intercepted — focus moves normally (a11y).

## i18n

New keys under `richTextEditor` in `messages.ts` + `en.ts` + `ru.ts`:

- `toolbar` (toolbar `aria-label`)
- `bold`, `italic`, `underline`, `strike` (mark button `aria-label`s)
- `bulletList`, `orderedList` (list button `aria-label`s)
- `blockType` (dropdown trigger `aria-label`), `paragraph`, `heading1`, `heading2`, `heading3`, `blockquote`, `codeBlock`, `mixed` (block-type labels)

## Styling

- Toolbar styles in `RichTextEditor.module.scss`: a `role="toolbar"` row (Cluster-like via `gap`), separators between groups, sits above the editable surface inside the same bordered container. Tokens only (Rule 3); spacing via `gap`/`padding`, no `margin` (Rule 4).
- Active toggle buttons use the existing `Button` selected/pressed affordance (or a token-based active style) — reuse `Button`'s variants rather than bespoke CSS where possible.
- `:focus-visible` rings on toolbar buttons (handled by `Button`).

## Testing

- **`commands.ts`** (pure, exhaustive): `activeMarks` (intersection across a multi-run/multi-block selection; collapsed → caret marks; collapsed + pending → pending); `currentBlock` (single, multi-same, multi-mixed → null, heading level); `runToggleMark`; `runSetBlock` over a multi-block selection; `runToggleList` (set + un-set); `runIndent` in/out with depth clamping.
- **`RichTextToolbar.tsx`**: buttons render with i18n labels; `aria-pressed` reflects `activeMarks`/`block`; clicks call the right callbacks with the right args; the block-type dropdown lists the types and labels the trigger from `block`; `disabled` disables everything.
- **`RichTextEditor.tsx`** additions: `toolbar` renders the toolbar; a mark-button / list-button / dropdown click → `onChange` with the transformed doc (mocked `readSelection`); Enter-in-empty-list-item exits to paragraph; Tab indents a list item; pending-marks unit logic (toggle collapsed → next insert is marked). jsdom can't do real caret geometry — those go to the browser.
- **Browser (Playwright)** in the demo: select text + click Bold → bold; set Heading 2 from the dropdown; click bullet-list → the block becomes a list; Tab indents; collapsed caret + Bold + type → bold text; active states track the selection; dark theme.

## Repo invariants

- Tests beside the code (`commands.test.ts`, `RichTextToolbar.test.tsx`, `RichTextEditor.test.tsx` additions).
- Demo: update `RichTextEditorDemo.tsx` to show `<RichTextEditor toolbar … />` (the editable example gains the toolbar). No new nav/route/registry entry needed (RichTextEditor already wired).
- `AGENTS.md`: update the `<RichTextEditor>` entry to mention the `toolbar` prop + the new commands/keys.
- Manifest: regenerate (`npm run build:manifest`) — `RichTextEditor` now composes Button/ButtonGroup/DropdownMenu in addition to RichText; the drift test must pass. No CLUSTERS change (already `Forms`).
- i18n keys in all three locale files.
- No new public component export (toolbar is internal); `RichTextEditorProps` gains `toolbar?: boolean`.

## Out of scope (this slice) — later slices

- Link creation/editing UI (the next natural slice; a link button + URL popover).
- Rich (HTML) paste + model ↔ HTML serialization.
- Undo/redo history.
- Floating/bubble (selection) toolbar; a toolbar button-customization API (which buttons show).
- Images, mentions, tables, color/highlight marks; drag-and-drop.
- Full IME edge-cases.

## Anti-patterns (for JSDoc `@remarks`)

- ❌ Building your own toolbar by reaching into the editor — use the built-in `toolbar` prop (a composable external toolbar is a later slice if needed).
- ❌ Expecting links / undo / image insertion from the toolbar — not in this slice.
- ❌ Assuming mark buttons need a selection — pending marks make them work with a collapsed caret (type after toggling).
