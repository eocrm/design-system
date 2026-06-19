# RichTextEditor — Serialization / Import slice (Slice 5) Design

**Status:** approved (brainstorm), ready for plan
**Date:** 2026-06-19
**Component:** `@eocrm/design-system` → `src/components/RichText/engine/` + `src/components/RichTextEditor/`
**Depends on:** the RichText engine + editor (Slices 1–4, all shipped).

## Goal

Let consumers **import existing content into `<RichTextEditor>`** from two formats:

- `fromHtml(html: string): RichDoc` — parse an HTML string into the model.
- `fromMarkdown(md: string): RichDoc` — parse a Markdown string into the model.

…and wire **rich paste** into the editor: pasting HTML (from the web, Word, Google Docs) produces formatted content (bold/italic/links/lists) instead of plain text.

The driver is _importing existing content_, both as a one-shot seed (`value={fromHtml(stored)}`) and live via paste.

## Non-goals (YAGNI — per the brainstorm)

- **No serialize-out** (`RichDoc → HTML` / `RichDoc → Markdown`). Parsing is independently testable by asserting on the resulting `RichDoc`.
- **No model for tables, images, colors, font families/sizes, alignment, horizontal rules** — dropped on import (text inside unknown containers is preserved; standalone non-text nodes are dropped).
- **No Markdown auto-detection on paste.** Paste parses `text/html` only; copied Markdown arrives as `text/plain` and inserts literally. `fromMarkdown` is the explicit standalone path.
- **No new dependency.** HTML parsing uses the browser's built-in `DOMParser`; Markdown is hand-rolled (matches the repo's zero-UI-dep policy and the all-hand-rolled engine precedent).

## Architecture

All parsing lives in the engine (pure model transforms, beside `renderDoc`). Markdown routes through HTML so there is a single tag→model mapping and a single sanitization point.

```
src/components/RichText/engine/
  safeHref.ts        ← (new) extract the existing private safeHref from renderDoc.tsx; export it
  renderDoc.tsx      ← (modify) import safeHref from ./safeHref instead of its local copy
  fromHtml.ts        ← (new) fromHtml(html: string): RichDoc — DOMParser walk + allowlist + sanitize
  mdToHtml.ts        ← (new) mdToHtml(md: string): string — internal; Markdown → our HTML subset
  fromMarkdown.ts    ← (new) fromMarkdown(md: string): RichDoc = fromHtml(mdToHtml(md))
  transforms.ts      ← (modify) add insertFragment(doc, range, fragment): { doc, selection }

src/components/RichTextEditor/
  RichTextEditor.tsx ← (modify) native `paste` listener: text/html → fromHtml → insertFragment
```

**Public API** — new exports from `src/index.ts`: `fromHtml`, `fromMarkdown`. `mdToHtml` and `safeHref` stay **internal** (not exported). `RichDoc` is already exported.

**`safeHref` extraction.** `safeHref` is currently a private function inside `renderDoc.tsx`. Extract it verbatim to `engine/safeHref.ts` (`export function safeHref(href: string): string | undefined`) and import it in both `renderDoc.tsx` and `fromHtml.ts`. Behavior is unchanged; this avoids a divergent second sanitizer. A regression test (`safeHref.test.ts`) pins its contract.

**Data flow — two entry points:**

1. **Seed** (standalone): `fromHtml(storedHtml)` / `fromMarkdown(storedMd)` → `RichDoc` → `<RichTextEditor value={...} />`. Editor untouched.
2. **Paste** (editor): clipboard `text/html` → `fromHtml` → a `RichDoc` fragment → `insertFragment` splices it at the selection → existing `commit({ doc, selection })` path. No HTML → plain-text fallback (current behavior).

**Runtime constraint.** `fromHtml` (and therefore `fromMarkdown`) requires a DOM environment for `DOMParser` — available in browsers and in jsdom (tests). This is documented on both functions. Acceptable for a client-side editor library.

## `fromHtml(html: string): RichDoc`

Parse with `new DOMParser().parseFromString(html, 'text/html')` (an **inert** document — scripts never execute) and walk `document.body`, producing a flat `Block[]`. The walk is allowlist-only: it reads recognized tags + text and emits a plain model, so scripts, event handlers, styles, and unknown markup can never reach the output. **The allowlist walk is the sanitizer** — there is no separate sanitization pass.

### Block walk

`collectBlocks(parent, out, listDepth)` iterates `parent.childNodes`, buffering loose inline/text content into a pending paragraph that is flushed whenever a block-level element is encountered (or at the end). Mapping:

| HTML                                                                                        | Model block                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `h1`/`h2`/`h3` (and `h4`–`h6` → clamp to level 3)                                           | `heading` (`level`)                                     |
| `p`                                                                                         | `paragraph`                                             |
| `blockquote` (each inner `<p>` or bare line → its own block)                                | `blockquote`                                            |
| `pre` / `pre > code`                                                                        | `code_block` (whitespace preserved; no inline marks)    |
| `ul` / `ol` → each `li`; nested `ul`/`ol` inside an `li` → recurse at `listDepth + 1`       | `bullet_item` / `ordered_item` with `depth = listDepth` |
| `div` / `section` / `article` / other unknown **block** containers                          | **unwrapped** — `collectBlocks` recurses into children  |
| loose top-level text / inline elements                                                      | buffered → wrapped into a `paragraph`                   |
| `script` / `style` / `head` / `table` / `img` / `figure` / `hr` / `iframe` / other non-text | **dropped** (not recursed)                              |

Each emitted block gets a fresh `nextId()`. List items: an `li`'s direct inline content becomes that item's inlines; a nested `ul`/`ol` within the `li` becomes subsequent items at `depth + 1` (the inverse of `renderDoc`'s depth→nesting reconstruction).

### Inline walk

`walkInline(el, activeMarks)` descends, carrying a mark set, and returns `Inline[]` **segments split at `<br>`** (each segment becomes a separate block of the parent's type — the model has no intra-block soft break).

| HTML inline                                     | Effect                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| text node                                       | emit a run with the current `activeMarks` (after whitespace handling)                                |
| `strong` / `b`                                  | add `bold` for descendants                                                                           |
| `em` / `i`                                      | add `italic`                                                                                         |
| `u`                                             | add `underline`                                                                                      |
| `s` / `del` / `strike`                          | add `strike`                                                                                         |
| `code` (not inside `pre`)                       | add `code`                                                                                           |
| `a[href]`                                       | add `link` with `safeHref(href)`; if `safeHref` returns `undefined`, drop the mark but keep the text |
| `br`                                            | end the current segment (block split)                                                                |
| `span` / `font` / `mark` / other unknown inline | **unwrap** — recurse with unchanged marks                                                            |

**Inline CSS recognition** (for Word / Google Docs, which use styled spans, not semantic tags): read the element's `style` and add marks accordingly, combined with the tag-derived marks:

- `font-weight` numeric ≥ 600, or `bold`/`bolder` → `bold`
- `font-style: italic` (or `oblique`) → `italic`
- `text-decoration`/`text-decoration-line` containing `underline` → `underline`; containing `line-through` → `strike`

Only these four properties are read; all other CSS is ignored.

### Whitespace

Mirror browser rendering: within non-`pre` content, collapse runs of whitespace (including newlines/tabs) to a single space; drop whitespace-only text nodes between block elements; trim each block's leading/trailing whitespace. Inside `pre` / `code_block`, preserve whitespace verbatim.

### Normalization & edge cases

- Adjacent equal-mark runs merged via `normalizeInlines`; an empty block holds a single empty run.
- A recognized block element always emits a block (an empty one holds a single empty run); only buffered **loose** content that is entirely whitespace emits nothing. A parse that yields zero blocks → `emptyDoc()`.
- Malformed/garbage HTML → DOMParser still yields a body; the walk extracts whatever text it can. Never throws.

### Worked example

```
fromHtml('<h2>Title</h2><p>Read the <a href="/x"><strong>docs</strong></a>.</p><ul><li>a<ul><li>b</li></ul></li></ul>')
→ blocks:
  heading(level 2): ["Title"]
  paragraph: ["Read the ", "docs"{bold,link:/x}, "."]
  bullet_item(depth 0): ["a"]
  bullet_item(depth 1): ["b"]
```

## Markdown — `mdToHtml` + `fromMarkdown`

`fromMarkdown(md) = fromHtml(mdToHtml(md))`. `mdToHtml` is a hand-rolled converter emitting our HTML subset; `fromHtml` does all model-building, depth-from-nesting, sanitization, and whitespace handling — one source of truth.

### Flavor: CommonMark + GFM strikethrough (restricted to the model)

**Block (line-based):**

- ATX headings `#`–`###` (`####`+ → `<h3>`, which `fromHtml` also clamps).
- Fenced code ` ``` ` / `~~~` → `<pre><code>` (content emitted verbatim, HTML-escaped, no inline parsing).
- Blockquote: consecutive `>` lines → `<blockquote>` (inner inline parsed).
- Unordered list `-` / `*` / `+` → `<ul><li>`; ordered `1.` / `1)` → `<ol><li>`. **Nesting by indentation** (≥2 spaces or a tab per level) → nested `<ul>`/`<ol>`.
- Blank-line-separated runs of text → `<p>`.

**Inline:** `**`/`__` → `<strong>`, `*`/`_` → `<em>`, `~~` → `<del>` (GFM), `` ` `` → `<code>`, `[text](url)` → `<a href="url">text</a>`. Backslash escapes (`\*`, `\_`, …) → literal. All text is HTML-escaped (`&`, `<`, `>`) so content cannot inject tags. `![alt](url)` is **not** treated as a link (leading `!` → literal text).

### Lossiness (inherent to Markdown — documented on `fromMarkdown`)

- **Underline** has no Markdown syntax → `fromMarkdown` never produces `underline`.
- **Images / tables** aren't modeled → not parsed.

### Robustness

Any line `mdToHtml` doesn't recognize degrades to HTML-escaped paragraph text. Never throws.

## `insertFragment(doc, range, fragment): { doc, selection }`

A new pure transform in `transforms.ts` (composes `deleteRange` / `sliceInlines` / `normalizeInlines` / `createBlock`). Splices a multi-block `fragment` (a `RichDoc`) at `range`, replacing any selection, with the conventional editor merge.

1. If `range` is non-collapsed → `deleteRange(doc, range)` first; continue from the resulting collapsed caret in block `B` at `offset`.
2. Let `left = sliceInlines(B.inlines, 0, offset)` and `right = sliceInlines(B.inlines, offset, blockLength(B))`. Let `F0…Fn` be the fragment blocks.
3. **Single-block fragment** (`n === 0`): pure inline splice — `B.inlines = normalizeInlines([...left, ...F0.inlines, ...right])`, `B.type` unchanged. Selection collapsed at `offset + runsLength(F0.inlines)`.
4. **Multi-block fragment** (`n ≥ 1`):
   - `Bleft` = `{ ...B, inlines: normalizeInlines([...left, ...F0.inlines]) }` (keeps `B`'s type).
   - middle blocks `F1…F(n-1)` inserted verbatim (fresh ids).
   - `Bright` = `{ ...Fn, id: nextId(), inlines: normalizeInlines([...Fn.inlines, ...right]) }` (keeps `Fn`'s type/level/depth).
   - Replace `B` in `doc.blocks` with `[Bleft, F1…F(n-1), Bright]`.
   - Selection collapsed in `Bright` at `runsLength(Fn.inlines)` (the join point between the pasted tail and the old right part).
5. No-op guard: an empty fragment (or a fragment that is a single empty paragraph) returns `{ doc, selection: collapsed(start) }` so callers can fall back.

`fragment` block ids are regenerated via `nextId()` to stay unique within the target document.

## Paste integration (`RichTextEditor.tsx`)

Add a native `paste` listener on the editor root (alongside the existing `beforeinput` wiring):

```
onPaste(e):
  if latest.current.readOnly: return
  const html = e.clipboardData?.getData('text/html')
  if (!html || !html.trim()) return        // no HTML → let beforeinput insert text/plain
  const root = rootRef.current; if (!root) return
  const range = readSelection(root); if (!range) return
  const fragment = fromHtml(html)
  if (isEmptyDoc(fragment)) return          // nothing usable → plain-text fallback
  e.preventDefault()
  commit(insertFragment(latest.current.value, range, fragment))
```

- `paste` fires before `beforeinput`; not calling `preventDefault` lets the existing plain-text path run untouched, so **plain paste is unchanged** and **rich paste becomes formatted**.
- Uses the `latest` ref + `readSelection`/`commit` already in the component. The selection restore after re-render is handled by the existing `pendingSelectionRef` + `useLayoutEffect` (commit stashes `insertFragment`'s returned selection).
- `isEmptyDoc` is the existing helper.

## Testing

- **`safeHref.test.ts`** (pure): relative kept; `http(s)`/`mailto`/`tel` kept; `javascript:`/`data:`/protocol-relative (`//host`) → `undefined`; empty → `undefined`. (Pins the extracted contract.)
- **`fromHtml.test.ts`** (jsdom): every block-mapping row (headings incl. h4–6 clamp, p, blockquote w/ inner `<p>`, `pre`→code_block w/ whitespace, `ul`/`ol`/`li` + **nested→depth**); div/section unwrap; loose top-level text → paragraph; script/style/table/img/hr dropped; inline marks (b/strong, i/em, u, s/del, code); `a[href]` → link, unsafe href dropped (text kept); **inline CSS** (font-weight 700 → bold, italic, underline, line-through); nested marks (`<strong><em>`); `<br>` → block split; whitespace collapse/trim + whitespace-only-between-blocks dropped; empty/garbage → `emptyDoc`.
- **`mdToHtml.test.ts`** (pure string→string): headings, fences (verbatim, escaped), blockquote, nested lists, paragraphs; inline bold/italic/strike/code/link + backslash escapes + text HTML-escaping; `![alt](url)` not a link.
- **`fromMarkdown.test.ts`** (jsdom): end-to-end MD → `RichDoc` on a representative doc (heading + nested list + bold link + code fence + blockquote); underline never produced.
- **`transforms.test.ts`** (extend) — `insertFragment`: single-block inline splice + caret offset; multi-block split/merge-ends + caret at the join; non-collapsed range deletes-then-inserts; paste into an empty doc; empty-fragment no-op.
- **`RichTextEditor.test.tsx`** (extend): dispatch a synthetic `paste` whose `clipboardData.getData('text/html')` returns `'<p>a <strong>b</strong></p>'` → the editor renders bold "b"; a plain-text-only paste (no `text/html`) still inserts literal text.
- **Browser (Playwright, manual):** dispatch a synthetic `paste` with rich HTML at a caret → formatted content inserted; paste over a selection replaces it.

## Packaging (CLAUDE.md core invariant)

- **New public exports** from `src/index.ts`: `fromHtml`, `fromMarkdown` — pure utilities, like the existing `emptyDoc` / `docFromText` (no component, no demo page or manifest entry required). `mdToHtml` / `safeHref` internal.
- **No new component** → no manifest CLUSTERS change. The editor's paste wiring composes no new design-system component, so **no manifest drift**.
- **`structure.test.ts`** is unaffected: these modules live in `engine/`, not a `components/<Name>/` dir, so the four-file rule doesn't apply (same as the existing engine modules).
- **Demo:** extend `RichTextEditorDemo` with an "Import" example — a control that seeds an editor from an HTML and a Markdown string via the functions; rich paste works live in the existing editors.
- **JSDoc (Rule 7):** `fromHtml` / `fromMarkdown` get a description + `@example` + a note on the DOM-environment requirement and the documented lossiness (underline/images for Markdown; non-model content dropped for HTML). Update the `RichTextEditor` JSDoc `@remarks` to note rich paste.
- **AGENTS.md:** add `fromHtml` / `fromMarkdown` (import functions) + the paste behavior to the RichText/RichTextEditor primer; note paste handles HTML only and Markdown import is via the standalone function.
- **i18n:** none required (no new user-facing strings; the demo's labels live in the playground).

## Risks / decisions (resolved)

- **One mapping path:** Markdown via `fromHtml(mdToHtml(...))` keeps a single tag→model + sanitization implementation (vs. a second MD→model parser).
- **Security:** `DOMParser` is inert (no script execution); the allowlist walk only extracts text + known marks + `safeHref`-checked hrefs, so untrusted HTML cannot inject anything into the model. No second sanitizer.
- **Word/Docs fidelity:** the four inline-CSS properties recover bold/italic/underline/strike from styled spans; deeper CSS is intentionally ignored.
- **Paste merge:** `insertFragment`'s first/last-block merge gives the conventional "paste continues the current line, tail rejoins after" behavior; jsdom-testable as a pure transform.
