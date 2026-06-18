# RichTextEditor — editable core (Slice 2) — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming)
**Package:** `@eocrm/design-system`
**Builds on:** the RichText engine (Slice 1, shipped `@eocrm/design-system@0.1.46`) — `docs/superpowers/specs/2026-06-18-richtext-engine-design.md`

## Goal

The first **editable** slice of the in-house WYSIWYG: a controlled `<RichTextEditor value={doc} onChange={setDoc} />` you can actually type formatted text into. It renders the rich-text model into a **contentEditable** surface, maps DOM selection ↔ model positions, and replays every input as one of the existing engine transforms. No new model logic — this slice is the **contentEditable ↔ model bridge**.

**Sequencing note:** the Slice-1 roadmap listed serialization next; we deliberately reorder to build toward the editor first (serialization is persistence interop that doesn't move editing forward — consumers store the JSON `RichDoc` until a serialization slice lands).

## Substrate decision: controlled contentEditable

The editor uses **contentEditable with the model as the single source of truth** — the browser is never allowed to mutate the DOM. This is how ProseMirror/Slate/Lexical work and is the pragmatic standard for prose (the browser still provides caret, selection, IME composition, mobile keyboards, and spellcheck — the parts that are brutal to reimplement). A fully-custom surface (CodeMirror-6 style, no contentEditable) was rejected: it would mean reimplementing IME and mobile input, which is overkill and risky for CRM rich text.

## The controlled loop

```
keystroke / paste / IME
  → beforeinput (mutating) OR keydown (shortcut)
  → e.preventDefault()                       // the browser does NOT edit the DOM
  → read DOM Selection → map to model Range  (selection.ts)
  → inputType/key → pick transform           (input.ts / shortcuts.ts)
  → { doc, selection } → onChange(doc)        // controlled: parent owns value
  → React re-renders contentEditable from doc (editable renderer; data-block-id anchors)
  → restore DOM Selection from model selection (selection.ts, in a layout effect)
```

Because **every** mutating input is `preventDefault`'d, the contentEditable DOM changes _only_ through React re-rendering the model — so React and contentEditable never fight (the classic controlled-contentEditable failure mode). The cost: we must intercept the full input surface (`beforeinput`, `keydown` for shortcuts, `compositionstart/end` for IME).

The editor reuses every Slice-1 engine transform unchanged.

## Modules

```
src/components/RichTextEditor/
  RichTextEditor.tsx        ← controlled component; owns the contentEditable surface + the loop
  selection.ts              ← DOM ↔ model selection mapping
  input.ts                  ← pure: applyInput(doc, range, inputType, data) → { doc, selection } | null
  shortcuts.ts              ← pure: applyShortcut(doc, range, keyEvent) → { doc, selection } | null
  RichTextEditor.module.scss
  selection.test.ts, input.test.ts, shortcuts.test.ts, RichTextEditor.test.tsx
  index.ts
```

Shared engine change (in RichText): `engine/renderDoc.tsx` gains an `options` arg `{ editable?: boolean }`:

- adds `data-block-id={block.id}` to every block element (the anchor `selection.ts` walks),
- renders an empty block with a trailing `<br>` (`<p><br></p>`) so it stays focusable/selectable in contentEditable.

The **same renderer** drives read-only `<RichText>` and the editable surface — no duplicate rendering. (`data-block-id` is harmless in read-only mode; the `<br>` only when `editable`.)

Prose styling is extracted from `RichText.module.scss` into a shared SCSS partial **`src/components/RichText/_prose.scss`**, `@use`d by both `RichText.module.scss` and `RichTextEditor.module.scss` (a cross-dir `@use '../RichText/prose'`), so read-only and editable render identically. The extraction must leave `RichText`'s rendered styling byte-for-byte equivalent (existing tests stay green).

### `selection.ts` (DOM ↔ model)

Operate on the contentEditable root element. Pure functions (no React):

```ts
pointFromDom(root: HTMLElement, node: Node, offset: number): Point | null
  // climb to the enclosing [data-block-id]; sum text-node lengths before `node`
  // within that block + `offset` → { blockId, offset }
pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null
  // find [data-block-id=point.blockId]; walk its text nodes accumulating length
  // until `offset` falls inside one → that text node + local offset (empty block → the block/br)
readSelection(root: HTMLElement): Range | null     // window.getSelection() anchor+focus → model Range
writeSelection(root: HTMLElement, range: Range): void   // set the DOM Selection from a model Range
```

### `input.ts` (beforeinput → transform), pure

```ts
applyInput(doc: RichDoc, range: Range, inputType: string, data: string | null):
  { doc: RichDoc; selection: Range } | null   // null = unsupported (let default / ignore)
```

Mapping (the caller `preventDefault`s all of these):

| inputType                                                                 | behavior                                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `insertText`                                                              | non-collapsed → `deleteRange` then `insertText`; collapsed → `insertText` at caret                                                  |
| `insertParagraph` (Enter)                                                 | non-collapsed → `deleteRange` then `splitBlock`; collapsed → `splitBlock`                                                           |
| `insertLineBreak` (⇧Enter)                                                | `splitBlock` (soft line-breaks deferred)                                                                                            |
| `deleteContentBackward` (⌫)                                               | non-collapsed → `deleteRange`; collapsed at block start → `mergeBlockBackward`; else delete `[offset-1, offset]`                    |
| `deleteContentForward` (Del)                                              | non-collapsed → `deleteRange`; collapsed at block end → merge the next block back; else delete `[offset, offset+1]`                 |
| `deleteWordBackward` / `deleteWordForward`                                | delete to the word boundary within the block (simple `\w+`/non-`\w` scan); falls back to single char at a block edge                |
| `insertFromPaste` / `insertReplacementText`                               | insert **plain** text (clipboard `text/plain` or `data`); rich/HTML paste deferred (needs serialization)                            |
| `formatBold` / `formatItalic` / `formatUnderline` / `formatStrikeThrough` | return `null` — handled in `shortcuts.ts` via keydown to avoid double-toggle; the component still `preventDefault`s the beforeinput |
| anything else                                                             | `null`                                                                                                                              |

### `shortcuts.ts` (keydown → mark toggle), pure

```ts
applyShortcut(doc: RichDoc, range: Range, e: { key; metaKey; ctrlKey; shiftKey }):
  { doc: RichDoc; selection: Range } | null
```

- Mod = ⌘ (mac) or Ctrl. Mod+B → bold, Mod+I → italic, Mod+U → underline, Mod+⇧+X → strike → `toggleMark`.
- Returns `null` for any non-shortcut key (component lets it through / handles via beforeinput).
- v1 only affects a **non-collapsed** selection (collapsed-caret "pending format" is deferred). `toggleMark` over a collapsed range is a no-op by the engine's definition.

### IME / composition (in `RichTextEditor.tsx`)

The one exception to "preventDefault everything":

- `compositionstart` → set an `isComposing` ref; during composition do NOT `preventDefault` `beforeinput`/`insertCompositionText` (let the browser compose in the DOM, which temporarily diverges from the model).
- `compositionend` → read the composed text, map the selection, reconcile into the model (`deleteRange` the composition span if needed + `insertText`), then re-render (which snaps the DOM back to match the model).
- Full IME edge-cases (composition over a non-collapsed selection, multi-block) are a later polish.

### `RichTextEditor.tsx` (the component)

```ts
interface RichTextEditorProps {
  value: RichDoc;
  onChange: (doc: RichDoc) => void;
  readOnly?: boolean; // renders the surface non-editable (delegates to <RichText> look)
  placeholder?: string; // shown when the doc is empty (consumer string; styled via ::before)
  autoFocus?: boolean;
  // passthrough: id, name, aria-label / aria-labelledby (default aria-label via i18n), className
}
```

- Renders a `contentEditable` (`suppressContentEditableWarning`) root containing `renderDoc(value, { editable: true })`.
- `forwardRef` to the contentEditable element.
- Tracks the **desired model selection** in a ref; after `onChange`-driven re-render, restores the DOM selection in a `useLayoutEffect` (so the caret lands where the transform put it).
- Wires `onBeforeInput` (→ `applyInput`), `onKeyDown` (→ `applyShortcut`, plus letting navigation keys through), `onCompositionStart/End`.
- Read-only: drops the editable behavior and just renders the doc (same prose styling).

## Styling (`RichTextEditor.module.scss` + shared prose partial)

- Shared prose partial gives both components identical typography/lists/quote/code styling (tokens only, Rule 3; spacing via `gap`/`padding`, no `margin`, Rule 4).
- Editable surface adds: a focus ring on the root (`:focus-within` / `:focus-visible`), a `min-height`, caret color, and an empty-state placeholder via `[data-empty]::before { content: attr(data-placeholder); color: var(--color-fg-subtle); }`.
- No layout/positioning that belongs to a parent.

## i18n

One key: `richTextEditor.editorLabel` (default `aria-label` for the editable region when none supplied), in `messages.ts` + `en.ts` + `ru.ts`. `placeholder` is a consumer-supplied content string (not i18n).

## Testing

- **`input.ts` / `shortcuts.ts`** — pure → exhaustive unit tests: each inputType (insert collapsed/over-selection, Enter, ⇧Enter, backward/forward delete at block start/mid/end, word delete, paste-plain), each shortcut (bold/italic/underline/strike, mod detection, non-shortcut → null), `formatX` → null.
- **`selection.ts`** — build a small DOM (block elements with `data-block-id` + nested mark spans + text nodes) and assert `pointFromDom`/`pointToDom` round-trip across run boundaries, block boundaries, and empty (`<br>`) blocks. `readSelection`/`writeSelection` for the cases jsdom's Selection supports.
- **`RichTextEditor.tsx`** — renders the value; `contentEditable` present; `ref` forwarded; `className` merged; default `aria-label`; `readOnly` drops editability; a dispatched `beforeinput` (with a stubbed selection) calls `onChange` with the transformed doc. (jsdom can't do real caret geometry/IME — those are browser-verified.)
- **Browser (Playwright)** in the demo: type text, Enter splits, Backspace merges, select a word + ⌘B bolds it, basic IME, caret lands correctly after each edit, dark theme.

## Repo invariants (Core invariant checklist)

- `RichTextEditor.test.tsx` + the per-module tests.
- Demo `packages/playground/src/pages/components/RichTextEditorDemo.tsx` (a controlled editor with a shortcuts hint) + wire into `App.tsx`, `navItems.ts` (**Forms** group), `ComponentsIndex.tsx`, and `registry.ts` `ComponentName` union.
- `src/index.ts` re-export (`RichTextEditor` + `RichTextEditorProps`).
- Manifest `RichTextEditor: 'Forms'` in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, then `npm run build:manifest` (drift test). RichTextEditor `composes` RichText (it imports the engine).
- `AGENTS.md` TL;DR + `@remarks` anti-patterns in JSDoc.
- i18n key added to all three locale files.
- The `renderDoc` `editable` option change keeps all existing `RichText` + renderDoc tests green (data-block-id is additive; the `<br>` only under `editable`).

## Out of scope (this slice) — each a later slice

- Toolbar UI; block-type/heading/list/quote/link **commands via UI**.
- List-specific input (Enter in an empty item exits the list; Tab/⇧Tab indent/outdent).
- Link creation/editing UI.
- Rich (HTML) paste + clipboard serialization; model ↔ HTML serialization.
- Undo/redo history (native undo is broken by the controlled `preventDefault` model; needs its own history stack).
- Collapsed-caret "pending" marks (toggle format then type).
- Images, mentions, tables, color/highlight marks; drag-and-drop.
- Full IME edge-cases (composition over a selection, across blocks).

## Anti-patterns (for JSDoc `@remarks`)

- ❌ Treating it as uncontrolled — it's controlled; you MUST render the `doc` from `onChange` back into `value`, or edits won't stick.
- ❌ Mutating `value` in place — pass the new `doc` the engine transforms return.
- ❌ Expecting a toolbar / lists / links / undo — not in this slice; use keyboard shortcuts for marks, Enter/Backspace for structure.
- ❌ Using it to display read-only content — use `<RichText>` (or `<RichTextEditor readOnly>`).
