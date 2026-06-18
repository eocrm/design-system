# RichTextEditor — Links slice (Slice 4) Design

**Status:** approved (brainstorm), ready for plan
**Date:** 2026-06-18
**Component:** `@eocrm/design-system` → `src/components/RichTextEditor/`
**Depends on:** the RichText engine (Slice 1), the editable core (Slice 2), and the toolbar (Slice 3) — all shipped.

## Goal

Let a user create, edit, and remove inline hyperlinks in `<RichTextEditor>` through a
selection-anchored floating bubble, opened from a toolbar **Link** button or **⌘K / Ctrl+K**.
The document model and renderer already support the `link` mark
(`{ type: 'link'; href: string }`, rendered as a sanitized `<a>` via `safeHref`); this slice adds
the _commands_ and the _UI_ that drive it.

## Non-goals (YAGNI)

- No link auto-detection / pasted-URL linkification.
- No "open in new tab" / `target` toggle, no title/text-vs-href split UI — the bubble edits the href only.
- No autocomplete of internal routes (a future slice could add it; the URL field is a plain input here).
- No URL scheme prompting / `https://` auto-prepend in v1 — the href is stored as typed (trimmed),
  and render-time `safeHref` is the safety net.
- No new public exports, no new demo page, no manifest entry — this is internal to `<RichTextEditor>`.

## Architecture

Three layers, mirroring the existing slices:

1. **Pure link commands** (`links.ts`) — no DOM, no React. Compose the existing engine transforms
   (`applyMark` / `removeMark` / `insertText`) and position helpers (`isCollapsed` / `orderedRange` /
   `findBlockIndex` / `blockLength`). Fully unit-testable in jsdom.
2. **The floating bubble** (`RichTextLinkEditor.tsx`) — a presentational form (URL `Input` + Apply /
   Remove `Button`s) portaled to `<body>` and positioned at the selection rect via a Floating UI
   virtual element, exactly like `AutocompleteMenu`.
3. **Editor wiring** (`RichTextEditor.tsx` + `RichTextToolbar.tsx`) — open-state, ⌘K, the toolbar Link
   button, and routing Apply/Remove through the existing `commit({ doc, selection })` path with DOM
   selection capture/restore.

No new engine transforms. No new dependency (`@floating-ui/react-dom` and `Input`/`Button` already ship).

## Module 1 — `links.ts` (pure commands)

```ts
import type { RichDoc, Range, Point } from '../RichText/engine/model';

/** The link at a point: its href and the full contiguous same-href range, or null. */
export interface LinkAtResult {
  href: string;
  range: Range;
}

/** Find the contiguous link run covering `point` (collapsed caret), or null. */
export function linkAt(doc: RichDoc, point: Point): LinkAtResult | null;

/** Apply / update a link over `range` (3 cases — see below). Returns the commit payload. */
export function setLink(
  doc: RichDoc,
  range: Range,
  href: string,
): { doc: RichDoc; selection: Range };

/** Remove the link mark over `range`. Returns the commit payload. */
export function removeLink(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range };
```

### `linkAt(doc, point)`

Locate the block (`findBlockIndex`). Walk its inline runs accumulating offsets. Determine the run that
"owns" the caret: the run containing the character at `offset` if `offset < blockLength`, else the run
containing the character at `offset - 1` (so a caret at the very end of a link still resolves to it). If
that owning run has a `link` mark, expand **left and right** across adjacent runs that carry a `link`
mark **with the same href** to get the contiguous extent `[start, end]` (character offsets within the
block). Return `{ href, range: { anchor: {blockId, start}, focus: {blockId, end} } }`. Return `null`
when there is no owning link run (including an empty block, or a caret at offset 0 of a non-link run).

`linkAt` operates on a collapsed point. The editor calls it with the selection's `focus` to drive the
toolbar Link button's active state and the edit pre-fill.

### `setLink(doc, range, href)` — three cases

Decide by `isCollapsed(range)` and `linkAt`:

1. **Non-collapsed `range`** → `applyMark(doc, range, { type: 'link', href })`. Because `withMark`
   replaces a same-type mark, re-applying over an existing link updates its href rather than stacking.
   `selection` = the input `range` (the linked text stays selected).
2. **Collapsed `range`, caret inside an existing link** (`linkAt(doc, range.anchor)` non-null) →
   `applyMark(doc, linkResult.range, { type: 'link', href })` over the link's full extent.
   `selection` = `linkResult.range` (the whole link stays selected so a follow-up Remove targets it).
3. **Collapsed `range`, caret not in a link** → insert the href as linked text:
   `insertText(doc, range.anchor, href)`, then `applyMark` over the inserted span
   `[anchor.offset, anchor.offset + href.length]`, with `{ type: 'link', href }`.
   `selection` = the inserted (now-linked) span.

**Empty / whitespace-only `href`:** `setLink` treats a trimmed-empty href as a no-op for case 3
(nothing to insert) and as a removal for cases 1–2 (delegates to `removeLink` over the same range).
The editor also guards this at the call site (see Module 3) so Apply with an empty field == Remove when
editing, == cancel when creating.

`href` is trimmed but otherwise stored verbatim — **no scheme normalization**. Safety is enforced at
render time by the engine's existing `safeHref` (blocks `javascript:`/`data:`/protocol-relative), so a
hostile href can be stored but never renders as a dangerous `<a href>`.

### `removeLink(doc, range)`

`removeMark(doc, range, 'link')`. `selection` = the input `range`. The editor passes the link's full
extent (from `linkAt`) when the caret is merely inside a link, so Remove clears the whole link.

## Module 2 — `RichTextLinkEditor.tsx` (the floating bubble)

Presentational. The editor owns all state; this renders the form and positions it.

```ts
export interface RichTextLinkEditorProps {
  /** Initial URL value (empty when creating). */
  href: string;
  /** Whether an existing link is being edited (controls the Remove button). */
  editing: boolean;
  /** Selection rect (viewport coords) the bubble anchors to. */
  anchorRect: { top: number; left: number; height: number; width: number };
  /** Apply the (trimmed) URL. */
  onApply: (href: string) => void;
  /** Remove the link (only reachable when `editing`). */
  onRemove: () => void;
  /** Dismiss without changes (Esc / click-outside). */
  onCancel: () => void;
}
```

Behavior:

- Portaled to `document.body`; positioned with `useFloating({ strategy: 'fixed', placement:
'bottom-start', whileElementsMounted: autoUpdate, middleware: [offset(6), flip(), shift({ padding: 4 })],
elements: { reference: virtualRef } })` where `virtualRef.getBoundingClientRect()` returns `anchorRect`
  — identical to `AutocompleteMenu`. `fixed` + portal escapes the editor's overflow and any
  Drawer/Modal ancestor.
- Local controlled state seeded from `href` (so typing doesn't round-trip through the editor model);
  re-seeded when `href` changes (keyed remount by the editor on open is acceptable and simpler — the
  editor renders the bubble with a `key` derived from the open target).
- Renders a labelled group: a `<form>` (or `role="group"`) with an accessible name from i18n, the URL
  `Input` (its own visible/`aria` label), an **Apply** submit `Button`, and — when `editing` — a
  **Remove** `Button` (danger tone). All copy via `useTranslation()`.
- **Keys:** `Enter` (form submit) → `onApply(value.trim())`; `Esc` (keydown on the bubble) → `onCancel`.
- **Click-outside:** a pointerdown listener on `document` that calls `onCancel` when the target is
  outside the bubble. (The editor additionally treats a click back into the editor as cancel.)
- **Autofocus:** focus the URL input on mount; select its contents when `editing` so a re-type replaces.

The bubble's input deliberately takes focus from the contentEditable — that's why the editor captures
the model range + selection rect _before_ opening (Module 3).

## Module 3 — Editor + toolbar wiring

### Toolbar (`RichTextToolbar.tsx`)

- Add a **Link** icon `Button` (new inline SVG in `icons.tsx`), `aria-label` = `t('richTextEditor.link')`,
  `onMouseDown` preventDefault (preserve the editor selection, like the other toolbar buttons).
- New props: `linkActive?: boolean` (drives `aria-pressed`) and `onOpenLink: () => void` (click handler).
- Disabled with the rest when `disabled`.
- The existing `onToggleMark` path already early-returns for `'link'`; the Link button uses the new
  `onOpenLink` callback instead, so the dead `link` branch can stay as a guard.

### Editor (`RichTextEditor.tsx`)

- New state: `linkEditor: { range: Range; href: string; editing: boolean; anchorRect: Rect } | null`.
- **Opening** (shared `openLinkEditor()` used by ⌘K and the toolbar button):
  1. Read the live selection (`readSelection(root)`); bail if none.
  2. Compute the target: if `linkAt(value, sel.focus)` is non-null → `range` = the link's extent,
     `href` = its href, `editing = true`. Else if the selection is non-collapsed → `range` = the
     selection, `href = ''`, `editing = false`. Else (collapsed, not in a link) → `range` =
     the collapsed selection, `href = ''`, `editing = false` (case-3 insert on Apply).
  3. Capture `anchorRect` from the DOM selection's `getBoundingClientRect()` (the current
     `window.getSelection().getRangeAt(0)`), falling back to the editor root's rect for an empty
     collapsed selection with a zero-size rect.
  4. `setLinkEditor({ range, href, editing, anchorRect })`.
- **⌘K / Ctrl+K** in `onKeyDown`: `e.preventDefault()` then `openLinkEditor()` (guard `!readOnly`).
- **Apply** (`onApply(href)`): if `href.trim()` is empty → behave as **Remove** when `editing`, else
  just close. Otherwise `commit(setLink(value, linkEditor.range, href.trim()))`. Then close + restore:
  set `pendingSelectionRef` to the result selection (the commit path already does this via the
  returned `selection`), `setLinkEditor(null)`, and refocus the editor root.
- **Remove** (`onRemove`): `commit(removeLink(value, linkEditor.range))`, `setLinkEditor(null)`, refocus.
- **Cancel** (`onCancel`): `setLinkEditor(null)`, restore the original DOM selection
  (`writeSelection(root, linkEditor.range)`), refocus the editor.
- **Rendering:** when `linkEditor` is non-null, render `<RichTextLinkEditor key={…} … />` (only when
  `!readOnly`). The toolbar's `linkActive` = `selection ? linkAt(value, selection.focus) != null : false`,
  and `onOpenLink` = `openLinkEditor`.
- ⌘K is wired even when `toolbar` is `false` (links don't require the toolbar) — but the bubble renders
  regardless of `toolbar` because it's a transient overlay, not part of the toolbar row. The Link
  _button_ only exists when `toolbar` is on.

### i18n (new keys in `messages.ts` + `en.ts` + `ru.ts`, under `richTextEditor`)

| key                  | en                   | ru                      |
| -------------------- | -------------------- | ----------------------- |
| `link`               | `Link`               | `Ссылка`                |
| `linkUrl`            | `Link URL`           | `URL ссылки`            |
| `linkUrlPlaceholder` | `https://… or /path` | `https://… или /path`   |
| `linkApply`          | `Apply`              | `Применить`             |
| `linkRemove`         | `Remove link`        | `Удалить ссылку`        |
| `linkEditorLabel`    | `Edit link`          | `Редактирование ссылки` |

Each gets a JSDoc line in the `Messages` interface (Rule 9 / existing pattern).

## Data flow (create case)

```
user selects "docs" → ⌘K
  → openLinkEditor(): linkAt(focus)=null, sel non-collapsed
      → linkEditor = { range: sel, href:'', editing:false, anchorRect: sel.getBoundingClientRect() }
  → bubble renders at the rect, input autofocused
user types "https://x", Enter
  → onApply("https://x")
      → commit(setLink(value, range, "https://x"))   // case 1: applyMark link over range
      → setLinkEditor(null); refocus editor
  → re-render: "docs" now an <a href> ; DOM selection restored to the linked span
```

## Testing

### `links.test.ts` (jsdom, pure — primary coverage)

- `linkAt`: caret inside a link → `{href, range}` spanning the whole link; caret outside → `null`;
  caret at the link's trailing boundary → resolves to the link; caret at offset 0 of a leading non-link
  run → `null`; a link split across two runs with the same href → single contiguous range; two adjacent
  links with _different_ hrefs → only the owning one.
- `setLink` case 1 (selection): link mark applied over the range; re-apply with a new href → href
  replaced, not stacked (`marks` has one `link`).
- `setLink` case 2 (collapsed in link): href updated over the full extent; selection == extent.
- `setLink` case 3 (collapsed elsewhere): href inserted as text + linked; selection == inserted span;
  surrounding text unmarked.
- `setLink` empty href: case 1/2 → behaves as removeLink; case 3 → no-op (doc unchanged).
- `removeLink`: link stripped over range; a co-located non-link mark (e.g. bold) survives.

### `RichTextLinkEditor.test.tsx` (RTL)

- Renders URL `Input` (accessible name from i18n) + Apply; Remove present only when `editing`.
- Field pre-filled from `href`; Enter fires `onApply` with the **trimmed** value; Esc fires `onCancel`.
- Remove button fires `onRemove`. Group has an accessible name (`linkEditorLabel`).

### `RichTextToolbar.test.tsx` (extend existing)

- Link button rendered (name = "Link"); `aria-pressed` reflects `linkActive`; click fires `onOpenLink`;
  disabled when `disabled`.

### Browser (Playwright — manual, as in prior slices; jsdom can't do caret/selection/contentEditable)

- Select text → ⌘K → type URL → Enter → renders an `<a>` with the href.
- Caret in a link → toolbar Link button → URL pre-filled → edit → Apply → href updated.
- Caret in a link → open → Remove → link gone, text kept.
- Caret in empty paragraph → ⌘K → type URL → Enter → URL inserted as linked text.
- Esc / click-outside → bubble closes, original selection restored, no model change.

## Packaging (CLAUDE.md core invariant)

This slice is internal to an already-exported component, so the component-creation checklist applies in
its "extend existing" form:

- **Tests:** the three test files above live beside their modules. ✔ Rule 1.
- **Demo:** extend the existing `RichTextEditorDemo` with a links example + a short prose note. **No new
  route / sidebar / overview-grid entry** (the demo already exists). ✔ Rule 2.
- **Exports:** none added — `links.ts` and `RichTextLinkEditor.tsx` are internal; only `RichTextEditor`
  stays exported from `src/index.ts`. No manifest CLUSTERS change.
- **JSDoc:** update the `RichTextEditor` function `@remarks` — links now exist (revise the "Expecting
  links / undo — not in this slice" anti-pattern), and add an anti-pattern: _don't hand-roll a link UI —
  use ⌘K / the toolbar Link button_. ✔ Rule 7.
- **AGENTS.md:** add a line to the `RichTextEditor` TL;DR noting link support (⌘K / toolbar Link button).
- **i18n:** new keys in all three i18n files. ✔ Rule 9.
- **SCSS:** any bubble styling is tokens-only and layout-free (Rule 3 / Rule 4); the bubble's own
  `position: fixed` comes from Floating UI's inline `floatingStyles`, not the component stylesheet —
  consistent with `AutocompleteMenu`.

## Open risks / decisions (resolved)

- **Focus theft from contentEditable:** resolved by capturing the model range + selection rect on open
  and restoring the DOM selection on apply/remove/cancel.
- **Bubble escaping overflow/Drawer:** resolved by the `fixed` + portal + virtual-anchor pattern proven
  by `AutocompleteMenu`.
- **href safety:** resolved by storing-as-typed and relying on render-time `safeHref` (already shipped
  - tested in the engine), avoiding a second, divergent sanitizer.

```

```
