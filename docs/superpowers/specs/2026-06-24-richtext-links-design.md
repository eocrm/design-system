# RichText/RichTextEditor links — autolink + `renderLink` substitution — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-24
**Component:** `@eocrm/design-system` → `src/components/RichText/**` + `src/components/RichTextEditor/**` (enhancement to existing components + the in-house engine; NOT a new component)

## Goal

Two capabilities on the in-house rich-text engine:

1. **Autolink** — the editor turns typed/pasted URLs into `link`-marked text automatically.
2. **`renderLink` substitution** — a consumer render-prop that lets the app replace a link's
   rendering with a meaningful block (e.g. a task `#123 — title`, a member, a contact chip)
   when the URL belongs to the current space — in BOTH the read-only `<RichText>` viewer AND
   inside `<RichTextEditor>` while composing (the chip renders as a non-editable atomic
   widget). The DS stays entity-agnostic; the "in current space?" check + the lookup
   (sync or async) are the consumer's.

The model is unchanged — links remain `{ type: 'link'; href }` marks on text runs;
serialization (`toHtml`/`toMarkdown`) is unchanged (a resolved chip still serializes as a
link). `renderLink` is purely a render-time hook.

## Resolved decisions (from brainstorm)

1. **Scope: viewer + editor**, shipped **all in one cycle** (incl. the `selection.ts`
   atomic-widget work).
2. **Autolink: type + paste.** Linkify on typing a URL + a boundary char (space / Enter /
   sentence punctuation) AND on paste (URL over a selection → wrap; bare URL → insert
   linked).
3. **Substitution API: a `renderLink` render-prop** — `renderLink(link, defaultNode) =>
ReactNode`. Consumer owns the in-space check + entity lookup + chip UI (sync, or async via
   their own component).

## Public API

```ts
// Shared hook type (exported from the package).
export interface RichTextLink {
  /** The (sanitized) URL the link points to. */
  href: string;
  /** The visible link text in the document (often equals href for an autolink). */
  text: string;
}
export type RenderLink = (link: RichTextLink, defaultNode: ReactNode) => ReactNode;
```

`<RichText>` (read-only viewer) — add:

```ts
interface RichTextProps {
  // …existing (value, className, …)
  /**
   * Replace how a link renders. Called for each `link` mark with `{ href, text }`
   * and the default `<a>`; return your own node (e.g. a task/member chip) or the
   * default. Use to render in-space URLs as meaningful blocks.
   */
  renderLink?: RenderLink;
}
```

`<RichTextEditor>` — add:

```ts
interface RichTextEditorProps {
  // …existing (value, onChange, mentions, …)
  /** Same hook as `<RichText renderLink>`, applied inside the editor — a returned
   *  node renders as a non-editable atomic chip (you can place the caret before/after
   *  it and delete it as a unit). */
  renderLink?: RenderLink;
  /** Auto-convert typed/pasted URLs into links. Default `true`. */
  autolink?: boolean;
}
```

Consumer usage:

```tsx
const renderLink: RenderLink = ({ href }, fallback) => {
  const task = parseTaskUrl(href); // consumer's "is this in my space?" logic
  return task ? <TaskChip id={task.id} href={href} /> : fallback;
};

<RichTextEditor value={doc} onChange={setDoc} renderLink={renderLink} />;
<RichText value={doc} renderLink={renderLink} />;
```

## Architecture

### A. Autolink (engine, pure)

New `src/components/RichText/engine/autolink.ts`:

- `URL_RE` — a conservative matcher: `https?://` URLs, and bare `www.<host>…` (normalized to
  `https://www.…`). Trailing sentence punctuation (`.,;:!?` and a closing `)`/`]` not part of
  the URL) is excluded from the match.
- `findUrl(text): { start: number; end: number; href: string } | null` — the LAST URL ending
  at/just before a boundary in `text` (for the type rule).
- `linkifyFragment(text): Inline[]` — split a plain string into runs, link-marking URL spans
  (for paste of plain text / HTML text nodes). All hrefs pass through `safeHref`.

**Type rule:** a new inline input rule invoked from the editor's input path (alongside
`matchBlockRule`/`applyInput`). When the user types a boundary char (space, Enter, or
sentence punctuation) right after a URL, the URL run gets `{ type: 'link', href }` via the
existing `setLink`/`applyMark`. Gated by `autolink !== false`. Implemented as
`engine/autolinkRule.ts` (or folded into `inputRules.ts`) returning a model edit; unit-tested
pure.

**Paste:** extend the existing `onPaste` handler in `RichTextEditor.tsx` (currently
HTML-only, line ~482):

- If the clipboard has **only plain text** that is a single URL and the selection is a
  **non-empty range** → wrap the selection in a link (`setLink`).
- If plain-text paste contains URLs → `linkifyFragment` the inserted text so URLs arrive
  linked.
- HTML paste continues through `fromHtml` (which already preserves `<a>` → link marks);
  optionally run `linkifyFragment` over text nodes there too (NICE-TO-HAVE; keep v1 to the
  plain-text path + existing HTML).

`safeHref` gates every href.

### B. `renderLink` threading (viewer + editor)

`renderDoc` gains an option:

```ts
interface RenderDocOptions {
  editable?: boolean;
  renderLink?: RenderLink;
}
```

In `wrapMark`, the `link` case becomes:

```tsx
case 'link': {
  const href = mark.type === 'link' ? safeHref(mark.href) : undefined;
  const fallback = <a href={href} rel="noopener noreferrer">{child}</a>;
  if (!renderLink || !href) return fallback;
  const custom = renderLink({ href, text: <model run text> }, fallback);
  return editable ? <RichLinkWidget len={runModelLen}>{custom}</RichLinkWidget> : custom;
}
```

- **Viewer (`editable !== true`):** return the consumer node (or fallback) directly. `<RichText>`
  passes `renderDoc(value, { renderLink })`.
- **Editor (`editable === true`):** wrap the consumer node in `RichLinkWidget` — a
  `contentEditable={false}` `<span data-rich-link data-len={N}>` (N = the link run's model
  text length) so the chip is atomic and the selection mapping can account for it.
  `<RichTextEditor>` passes `renderDoc(value, { editable: true, renderLink })`.
- If `renderLink` returns the fallback (plain `<a>`), the editor still wraps it? **No** — only
  wrap when the consumer returned a _custom_ node (≠ fallback). A plain autolink stays editable
  text (no widget), so editing a normal link is unchanged. Detection: compare the returned node
  to `fallback` by reference (`custom !== fallback` ⇒ wrap).

### C. Editor atomic widget + widget-aware `selection.ts`

The chip's DOM text (e.g. `#123 Task`) differs from the model run text (the URL). The mapping
in `selection.ts` counts character data, so it must account for `[data-rich-link]` widgets.

**`offsetWithinBlock(blockEl, node, offset)`** — keep the existing `range.toString().length`,
then CORRECT for each `[data-rich-link]` widget fully contained in the range:

```
model = raw
for each w in blockEl.querySelectorAll('[data-rich-link]'):
  if range fully contains w:                       // both edges of w inside the range
    model += Number(w.dataset.len) - (w.textContent?.length ?? 0)
return model
```

(A widget the range ends _inside_ can't happen — the caret can't enter a `contentEditable=false`
node, so a DOM point is always before or after a widget, never within. Use
`range.isPointInRange`/node comparison to test "fully contained".)

**`pointToDom(blockEl, point)`** — replace the text-only walker with a widget-aware walk:
accumulate model length over text nodes (their `textContent.length`) and `[data-rich-link]`
widgets (their `data-len`, NOT their inner text, and don't descend); when `remaining` lands:

- within a text node → `{ node, offset: remaining }` (as today);
- exactly at a widget boundary → the position just before (offset 0 at start) or after the
  widget (a DOM point referencing the widget's parent + child index, so the caret sits adjacent,
  never inside).

Both changes are covered by extending `selection.test.ts` with docs containing a resolved-link
widget (round-trip `pointFromDom`↔`pointToDom`, and offsets before/after/spanning the widget).

**Atomic delete:** in the editor keydown handler, Backspace with a collapsed caret immediately
**after** a resolved-link run (or Delete immediately **before** one) removes the WHOLE link run
in one step (via `deleteRange` over the run's model range) instead of nibbling one URL char
(which would un-resolve the chip into a broken link). "Resolved-link run" = a `link` run for
which `renderLink` returns a custom node; the editor already has `renderLink`, so it can test a
candidate run. Arrow keys + click need no special handling — `contentEditable=false` makes the
browser step over / land beside the widget for free.

## Testing

- **`autolink.test.ts`** (pure): `findUrl` / `linkifyFragment` over many cases — http/https,
  `www.`, trailing punctuation, URL mid-sentence, multiple URLs, non-URLs, unsafe schemes
  (`javascript:` → rejected by `safeHref`), email-ish text (NOT linked).
- **autolink type rule** (pure): typing a boundary after a URL link-marks the URL run; no
  boundary → no link; `autolink={false}` → no link.
- **paste** (component or pure helper): URL over a selection → linked selection; bare URL paste
  → inserted linked; HTML paste still works.
- **`renderDoc.test.tsx`**: `renderLink` swaps the `<a>` in viewer mode; in editable mode a
  custom return is wrapped in `[data-rich-link][data-len]`; a fallback return is NOT wrapped.
- **`selection.test.ts`** (the risk area): offset round-trips with a resolved-link widget in
  the block — caret before/after the widget maps to the run's start/end model offsets; a
  multi-run block with a widget in the middle maps correctly.
- **atomic delete** (component): Backspace after a resolved-link chip deletes the whole run.
- **`RichText.test.tsx`** / **`RichTextEditor.test.tsx`**: the `renderLink` prop renders the
  custom node; `autolink` default + opt-out.

## Packaging (enhancement — NOT the new-component invariant)

`RichText` + `RichTextEditor` already ship demos, routes, nav, manifest entries, AGENTS
sections. This change only:

- **Engine + editor + tests** (above).
- **Exports** from `src/index.ts`: the new `RichTextLink` + `RenderLink` types (next to the
  existing RichText/RichTextEditor exports). No new component, no manifest change.
- **Demos:** update `packages/playground/src/pages/components/RichTextEditorDemo.tsx` and
  `RichTextDemo.tsx` with a working `renderLink` example — a tiny `parseTaskUrl` that turns a
  `https://app.eocrm/task/123`-style URL into a `<Badge>`/chip task block, and a plain-link
  fallback; plus an autolink example (type/paste a URL). Exercises the real components.
- **JSDoc (Rule 7):** `renderLink` + `autolink` props documented; `@remarks` anti-patterns
  (don't do heavy synchronous work in `renderLink` — return a component that fetches/caches;
  `renderLink` is render-time, not stored — serialization stays a link; a returned chip in the
  editor is atomic, not editable text).
- **AGENTS.md:** extend the `<RichTextEditor>` / `<RichText>` entries with autolink +
  `renderLink`.
- **i18n:** none (no new user-facing strings; the chip is consumer content; the link tool's
  labels already exist).

## Risks / decisions (resolved)

- **Widget-aware selection mapping is the main risk** — isolated to two functions via the
  length-correction trick (keep `range.toString()`, adjust for widgets) + a widget-aware
  `pointToDom`; covered by extended `selection.test.ts` + browser verification of caret
  placement, arrowing past, and atomic delete.
- **Only custom returns are wrapped** in the editor (`custom !== fallback`) — a normal link
  stays editable text, so existing link editing (⌘K) is unchanged.
- **Async resolution is the consumer's** — `renderLink` returns a node; a consumer that needs a
  lookup returns their own component (loading → resolved). The DS never awaits.
- **Serialization unchanged** — a resolved chip is still a `link` mark; `toHtml`/`toMarkdown`
  emit a link. Copy/paste of a chip carries the URL.
- **Autolink false positives** — conservative matcher + `safeHref`; `autolink={false}` opts out
  entirely.
