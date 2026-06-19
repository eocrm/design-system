# RichTextEditor — Serialization / Export slice (Slice 7) Design

**Status:** authored autonomously (user AFK, delegated "do as you recommend"), ready for plan
**Date:** 2026-06-19
**Component:** `@eocrm/design-system` → `src/components/RichText/engine/`
**Depends on:** the RichText engine + the import slice (`fromHtml`/`fromMarkdown`, `safeHref`), all shipped.

## Goal

Complete the serialization round-trip with **serialize-out**:

- `toHtml(doc: RichDoc): string` — serialize the model to an HTML string.
- `toMarkdown(doc: RichDoc): string` — serialize the model to a Markdown string.

These are the inverse of `fromHtml` / `fromMarkdown`. The driving use case is **HTML/email output and storage** — rendering a `RichDoc` outside the editor (email bodies, notifications, persisting as HTML/MD, exporting to a Markdown-based system).

## Why now

The import slice deliberately skipped serialize-out (YAGNI for "import existing content"). With undo/redo shipped, the editor is feature-complete; serialize-out closes the loop: a consumer can now persist/display content as HTML or Markdown and round-trip it (`fromHtml(toHtml(doc)) ≈ doc`). It mirrors the import slice and reuses its primitives (`safeHref`, the HTML escapers, the renderer's list-depth logic).

## Non-goals (YAGNI)

- **No pretty-printing** — `toHtml` emits compact HTML (no inter-tag indentation). `fromHtml` collapses whitespace anyway.
- **No full CommonMark coverage in `toMarkdown`** — only the model's own constructs (headings, bold/italic/strike/code, links, blockquote, lists, code fences). **Underline has no Markdown syntax → dropped** (documented; symmetric with `fromMarkdown`, which never produces it).
- **No editor/UI changes** — these are pure functions; `<RichTextEditor>`'s props are unchanged. No new component.
- **No new dependency** — pure string builders (no `react-dom/server`).

## Architecture

```
src/components/RichText/engine/
  escape.ts          ← (new) extract escapeHtml/escapeAttr from mdToHtml.ts; export them
  mdToHtml.ts        ← (modify) import escapers from ./escape
  listDepths.ts      ← (new) extract effectiveDepths + isListItem from renderDoc.tsx; export them
  renderDoc.tsx      ← (modify) import effectiveDepths/isListItem from ./listDepths
  toHtml.ts          ← (new) toHtml(doc): string — model → compact HTML string
  toMarkdown.ts      ← (new) toMarkdown(doc): string — model → Markdown string
```

**Public API** — new exports from `src/index.ts` (via `components/RichText/index.ts`): `toHtml`, `toMarkdown`. `escape.ts` / `listDepths.ts` stay internal. `RichDoc` is already exported.

**Two small extractions (DRY, the way a good dev improves code they touch):**

1. **`escape.ts`** — `escapeHtml` and `escapeAttr` are currently private in `mdToHtml.ts`. Extract verbatim to `engine/escape.ts`; `mdToHtml` and `toHtml` both import them. (A regression test pins the contract.)
2. **`listDepths.ts`** — `effectiveDepths(blocks): number[]` (the gap-free depth normalization that lets malformed depth jumps never drop items) and `isListItem(block): boolean` are private in `renderDoc.tsx`. Extract verbatim; `renderDoc` and `toHtml` both import them, so the renderer and the serializer reconstruct list nesting identically (single source of truth for depth normalization).

Both extractions are behavior-preserving (the existing `renderDoc.test.tsx` / `mdToHtml.test.ts` keep them honest).

## `toHtml(doc: RichDoc): string`

A pure string builder mirroring `renderDoc`'s structure, emitting **compact** HTML.

**Blocks** (each on its own, concatenated, no separators):
| Block | HTML |
| --- | --- |
| `paragraph` | `<p>{inlines}</p>` |
| `heading` (level n) | `<h{n}>{inlines}</h{n}>` |
| `blockquote` | `<blockquote>{inlines}</blockquote>` |
| `code_block` | `<pre><code>{escapeHtml(text)}</code></pre>` (no inline marks) |
| `bullet_item` / `ordered_item` | grouped into `<ul>`/`<ol>` with nested `<li>` from `effectiveDepths` |

**List grouping:** identical algorithm to `renderDoc` — compute `effectiveDepths(blocks)`, walk consecutive list items, recursing a child `<ul>`/`<ol>` (attached inside the preceding `<li>`) whenever the effective depth increases. Reuses the extracted `effectiveDepths`/`isListItem`.

**Inlines:** for each run, wrap the `escapeHtml`'d text in mark tags in the **same deterministic order** `renderDoc` uses — `MARK_ORDER = ['link','bold','italic','underline','strike','code']`, link outermost → code innermost:

- bold→`<strong>`, italic→`<em>`, underline→`<u>`, strike→`<s>`, code→`<code>`.
- link→`<a href="{escapeAttr(safe)}" rel="noopener noreferrer">…</a>` where `safe = safeHref(href)`. **If `safeHref` returns `undefined` (unsafe), the link wrapper is dropped** — the inner (still mark-wrapped) text is emitted without an `<a>`. (`safeHref` is applied on output too: defense in depth, so a model carrying an unsafe href can never serialize to a dangerous `<a>`.)

`toHtml` is **lossless** for the model (underline survives as `<u>`), so `fromHtml(toHtml(doc))` reproduces the document structurally.

**Edge cases:** an empty paragraph → `<p></p>`; an empty document (`emptyDoc()`, one empty paragraph) → `<p></p>`. Text is always `escapeHtml`'d; hrefs `escapeAttr`'d; nothing else is interpolated, so output is injection-safe.

### Worked example

```
toHtml({ blocks: [
  heading(2, "Title"),
  paragraph(["Read the ", link("/x", bold("docs")), "."]),
  bullet_item(0, "a"), bullet_item(1, "b"),
]})
→ '<h2>Title</h2><p>Read the <a href="/x" rel="noopener noreferrer"><strong>docs</strong></a>.</p><ul><li>a<ul><li>b</li></ul></li></ul>'
```

## `toMarkdown(doc: RichDoc): string`

A pure string builder emitting CommonMark + GFM-strikethrough, restricted to the model.

**Blocks** (separated by a blank line):
| Block | Markdown |
| --- | --- |
| `paragraph` | `{inline}` |
| `heading` (n) | `{'#'.repeat(n)} {inline}` |
| `blockquote` | `> {inline}` |
| `code_block` | ` ``` `\n`{text}`\n` ``` ` (verbatim, no escaping/inline) |
| `bullet_item` (depth d) | `{'  '.repeat(d)}- {inline}` |
| `ordered_item` (depth d) | `{'  '.repeat(d)}1. {inline}` (always `1.`; renderers renumber) |

**Inlines:** wrap the MD-escaped text, innermost→outermost as `code` → `strike` (`~~`) → `italic` (`*`) → `bold` (`**`) → `link` (`[…](url)`):

- `code`→`` `text` `` (text NOT MD-escaped inside code; backticks in content are a known v1 limitation), `strike`→`~~…~~`, `italic`→`*…*`, `bold`→`**…**`, `link`→`[…]({safeHref(href) ?? ''})`.
- **`underline` is dropped** — no Markdown syntax; emitting raw `<u>` wouldn't round-trip (`mdToHtml` escapes it), so the text is emitted without an underline marker. Documented as lossy (use `toHtml` for full fidelity).

**MD escaping** (best-effort, on `paragraph`/`heading`/`blockquote`/list text — NOT code): backslash-escape the inline specials `\ * _ ` [ ]`so literal occurrences don't become formatting on a round-trip; at a block's start additionally escape a leading`#`, `>`, `-`, `+`, or `digit.` that would otherwise be read as a block marker. Over-escaping (a stray backslash) is preferred to under-escaping (wrong structure). Documented as best-effort.

**Lossiness (documented on `toMarkdown`):** underline dropped; images/tables not in the model; nested-list indentation uses 2 spaces per level; content containing a literal ` ``` ` (in a `code_block`) or a backtick (in inline `code`) is a known v1 fidelity limitation (the fence/delimiter isn't lengthened to avoid collision).

### Worked example

```
toMarkdown({ blocks: [ heading(1,"Title"), paragraph(["see ", link("/x","docs")]), bullet_item(0,"a"), bullet_item(1,"b") ]})
→ '# Title\n\nsee [docs](/x)\n\n- a\n  - b'
```

## Testing

- **`escape.test.ts`** (pure): `escapeHtml` (`&<>`), `escapeAttr` (`&<>"'`). Pins the extracted contract.
- **`listDepths.test.ts`** (pure): `isListItem`; `effectiveDepths` (gap-free clamp — `[0,2,1]`→`[0,1,1]`, non-list resets, leading deep clamps to 0).
- **`toHtml.test.ts`** (pure): each block row; nested lists → `<ul><li><ul>`; mark nesting order (link outermost, code innermost); `<u>` for underline; unsafe href → link dropped, text kept; text/attr escaping; empty doc → `<p></p>`.
- **`toMarkdown.test.ts`** (pure): each block row; nested-list indentation; inline markers + nesting; underline dropped; MD-special escaping (leading `#`/`-`, inline `*`); code fence verbatim.
- **Round-trip tests** (jsdom, the strongest guarantee): `fromHtml(toHtml(doc))` deep-equals `doc` (ids aside) for a representative doc covering every block + mark incl. underline + nested lists; `fromMarkdown(toMarkdown(doc))` matches `doc` **except** underline (asserted dropped).
- **Existing suites** `renderDoc.test.tsx` + `mdToHtml.test.ts` must stay green after the extractions (no behavior change).

## Packaging (CLAUDE.md core invariant)

- **New public exports** `toHtml` / `toMarkdown` from BOTH `components/RichText/index.ts` and `src/index.ts` — pure utilities like `fromHtml`/`fromMarkdown`/`emptyDoc`. `escape.ts`/`listDepths.ts` internal.
- **No new component** → no manifest CLUSTERS change, no manifest drift, no `structure.test` four-file obligation (engine modules).
- **Demo:** extend `RichTextEditorDemo` — a small read-only panel showing the live editor's doc serialized to HTML and Markdown (a `<Text>`/`<Code>` block updated from `toHtml(doc)` / `toMarkdown(doc)`), demonstrating the round-trip against the real component.
- **JSDoc (Rule 7):** `toHtml`/`toMarkdown` get a description + `@example` + the documented lossiness (Markdown underline) and the `safeHref`-on-output note.
- **AGENTS.md:** add `toHtml`/`toMarkdown` to the RichText/RichTextEditor primer (serialize-out; pair with `fromHtml`/`fromMarkdown`; Markdown drops underline — use HTML for full fidelity).
- **i18n:** none (no new user-facing strings; the demo's labels live in the playground).

## Risks / decisions (resolved, autonomously)

- **toHtml hand-rolled vs `renderToStaticMarkup`:** hand-rolled keeps the engine pure + dependency-free and gives compact output; the shared `effectiveDepths`/`isListItem` extraction prevents list-nesting divergence from the renderer.
- **Security:** text is `escapeHtml`'d, hrefs `escapeAttr`'d AND `safeHref`-checked on output; nothing else is interpolated, so serialized HTML is injection-safe even if the model somehow carried a hostile href.
- **Markdown underline:** dropped (not representable, not round-trippable) rather than emitting non-round-tripping raw `<u>`; `toHtml` is the full-fidelity path.
