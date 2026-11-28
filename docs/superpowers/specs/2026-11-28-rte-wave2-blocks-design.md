# RichTextEditor wave 2 — divider, checklist, code language + inline code, slash menu

Tasks: DS-101, DS-99, DS-104, DS-103. Requested for the eocrm wiki (EO-260).
One branch, one PR, one release. Waves 3 (callout, toggle, table — need a
container model) and 4 (link cards, embeds — consumer callbacks) come later.

## Intent

The eocrm wiki needs the block set people expect from Notion/Confluence. This
wave adds everything that fits today's **flat** block model (an ordered list of
blocks, lists addressed by `depth`), plus the slash menu that makes blocks
discoverable. Every addition is a stored-format change for eocrm's Yjs mapping,
so each one is documented in a new "Stored format" section.

## Goals / non-goals / anti-goals

- Goals: the four tasks as written, except where this doc overrides them.
- Non-goals: container blocks (callout, toggle, table), link cards, embeds
  (later waves; the slash menu gains them as they ship).
- Anti-goals: growing the main `RichTextEditor` chunk with Prism; changing what
  existing documents look like; turning on new behaviour (slash menu) for
  existing consumers without opt-in.

## Approaches considered

1. **Extend the flat model** (chosen). Divider is a void like `attachment`;
   checklist items are list items with `checked`; language is a block attribute.
   Reuses void caret handling, list depth/indent/Enter, and serializers.
2. **Introduce a block tree now** so waves 2 and 3 share it. Rejected for this
   wave: none of these four blocks needs nesting, and a tree rewrite would hold
   all of them hostage to the hardest design (tables).
3. **Slash menu as a separate component** consumers compose. Rejected: it must
   read caret context and commit edits atomically, which only the editor can do.

## Design

### Model (`RichText/engine/model.ts`)

- `BlockType` gains `'divider'` and `'checklist_item'`.
- `Block` gains `checked?: boolean` (`checklist_item` only; absent = unchecked)
  and `language?: string` (`code_block` only; absent = plain).
- `isVoidBlock` → attachment **or** divider. `isListItem` → bullet, ordered,
  checklist.
- `splitBlock` on a `checklist_item` gives the new item `checked: false`.
  `setBlockType` drops `checked` unless the target is `checklist_item`, and
  drops `language` unless the target is `code_block`.

### DS-101 Divider

- Editor: rendered as `<figure data-block-id contentEditable={false}><hr/></figure>`
  so `selection.ts` void handling (`figureBlock`, `voidCaretSide`, `pointToDom`)
  and `input.ts` `voidDelete` apply. `figureBlock` currently assumes every
  figure is an attachment; attachment-only paths (resize, alt, upload state)
  need a type guard. Inserting uses the
  `insertAttachmentBlock` pattern (split, void, trailing paragraph).
- Input rule: `---` then space **or** Enter in an empty-but-for-marker
  paragraph. (Enter is a new trigger; only `---` uses it.)
- Inserted from the toolbar block dropdown, block menu, slash menu. Not a
  "Turn into" target (a void can't hold the text).
- Read-only: `<hr>` (implicit `role="separator"`) styled with the DS Divider
  token.
- HTML `<hr>` both ways (`fromHtml` currently drops `HR`). Markdown `---` both
  ways (`mdToHtml` gains thematic breaks `---`, `***`, `___`).

### DS-99 Checklist

- Rendering: consecutive `checklist_item`s at the same depth form one
  `<ul data-type="checklist">`; `collectList` starts a new list when the item
  type switches to/from `checklist_item` (bullet/ordered mixing keeps today's
  behaviour). Each `<li>` holds a native `<input type="checkbox">` plus a text
  span; the checkbox is `aria-labelledby` the span (fallback `aria-label` =
  "Checklist item" via i18n when the text is empty).
- Editor: the checkbox is a `contentEditable={false}` widget outside the text
  span so caret offsets ignore it. Clicking/Space on it toggles `checked` as one
  undo step, `onEdit` kind `'other'`; it keeps focus in the editor.
- Input rules (space trigger): `[]`, `[ ]` → unchecked; `[x]`, `[X]` → checked.
- Toolbar: a third list toggle button (checklist icon) beside bullet/numbered;
  block menu "Turn into" and slash menu entries. `runToggleList`/`runIndent`
  and Tab/Enter handling treat it like other list items.
- Nesting: a `checklist_item` may nest under any list item and vice versa
  (GFM allows it); Tab indents regardless of the previous item's type. At the
  same depth a switch to or from `checklist_item` closes the current list and
  opens a new one, so an ordered run interrupted by a checklist restarts at 1
  (as GFM renders it). Existing documents contain no checklist items, so
  nothing they render changes.
- Read-only: `<RichText onToggleCheck?: (blockId, checked) => void>`. Absent →
  checkboxes are `disabled` (state visible, not operable). Present → operable;
  the consumer updates the doc (RichText stays controlled-by-value).
- HTML: `<ul data-type="checklist"><li data-checked="true|false"><input type="checkbox" checked disabled>text</li></ul>`;
  `fromHtml` also accepts GFM-style `<li><input type="checkbox">` inside any `ul`.
  Markdown: `- [ ] x` / `- [x] x` both ways (indent = depth).

### DS-104 Code language, highlighting, inline code

- Languages: the editor picker offers the full `CodeBlockLanguage` set after
  the merge — CodeBlock's existing `json`, `bash`, `javascript`, `typescript`,
  `python`, `go`, `kotlin`, `java`, `csharp`, `rust` plus new `php`, `sql`,
  `yaml`, `html`, `css`, `markdown` — with "Plain text" (attribute absent)
  first. Stored values are always the canonical name: imports normalise the
  aliases `js`, `jsx`→javascript; `ts`, `tsx`→typescript; `sh`, `shell`,
  `zsh`→bash; `py`→python; `yml`→yaml; `md`→markdown; `cs`, `c#`→csharp;
  `kt`→kotlin; `rs`→rust; `htm`, `xml`→html. Any other value is stored
  verbatim (lower-cased), rendered plain and round-tripped unchanged. Prism bundles all but PHP and Bash; Bash is already
  registered there, PHP gets a small grammar the same way. Unknown stored values
  render as plain and survive round-trips unchanged.
- Lazy: `highlight.ts` (Prism) is reached only via a dynamic `import()` from a
  small `useHighlight(code, language)` hook. Until it resolves, code renders as
  plain text (identical text, so caret mapping is unaffected). Budget:
  `scripts/size-guard.mjs` sums every chunk, lazy ones included, so `rte` is
  raised by the measured growth (expected: about the Prism chunk). Laziness is
  verified separately by a Node test that fails if any RichText/RichTextEditor
  module statically imports `CodeBlock/highlight` or `prism-react-renderer`
  (decision: no size-guard tooling change in this wave).
- Editor: tokens render as plain spans inside `<code>`; `pointToDom` already
  walks text nodes through inline elements. Language picker: a compact Select
  anchored to the code block's top-end corner (`useAnchoredFloating`), shown
  while the caret is in that code block; changing it is one `'other'` edit.
- Tab in a code block inserts two spaces (Shift+Tab outdents the line).
  Escape, then Tab, moves focus out (documented; matches the APG guidance for
  editors that capture Tab).
- Read-only: highlighted `<pre><code class="language-x">` with a Copy button
  (reusing CodeBlock's copy helper and i18n strings). Token colours come from
  CodeBlock's existing token CSS, which already meets contrast in both themes.
- Serialization: Markdown fences carry the info string both ways (`mdToHtml`
  reads it). HTML `<pre><code class="language-x">` both ways.
- Inline code mark (model/serializers already support it):
  - Mod+E shortcut and a toolbar button (after strike).
  - Input rule: typing a closing backtick after `` `text `` converts to code,
    as one undo step; a lone or doubled backtick does nothing.
  - Exclusivity applies only when the user acts; stored documents are never
    normalised (existing code+bold runs keep rendering as today). Applying `code` strips bold/italic/underline/strike/text and
    background colour from the range; those toggles are no-ops (buttons
    disabled) when the selection is entirely code. Links may wrap code.

### DS-103 Slash menu

- Prop: `slashMenu?: boolean | { items?: (defaults: SlashItem[]) => SlashItem[] }`.
  **Off by default** so existing editors don't change. eocrm opts in.
- Trigger: `/` at block start or after whitespace, in a paragraph or heading;
  never during IME composition; not in code blocks.
- Filtering by label + keywords as the user types; Arrow keys, Enter picks,
  Escape closes and leaves the typed `/text`. Groups: Text, Lists, Media,
  Advanced. Each entry: icon, name, hint.
- Public types (exported):
  ```ts
  type SlashGroup = 'text' | 'lists' | 'media' | 'advanced';
  interface SlashItem {
    id: string; group: SlashGroup; label: string; hint?: string;
    icon?: ReactNode; keywords?: string[];
    run: (api: SlashApi) => void;
  }
  interface SlashApi {
    /** Block holding the `/`, already stripped of `/query`. */
    blockId: string;
    /** Convert that block, like the block menu's "Turn into". */
    turnInto(change: { type: BlockType; level?: 1 | 2 | 3 }): void;
    /** Insert blocks after it; if it is empty, it is replaced. Ids are reassigned via createBlockId. */
    insertBlocks(blocks: Block[]): void;
    /** Open the editor's upload picker (only when `upload` is set). */
    openUpload(kind: 'image' | 'file'): void;
  }
  ```
  `run` is synchronous. Stripping `/query` plus everything `run` does in that
  call is one undo step (`'other'`). Anything async (a consumer fetching a
  template) is the consumer's own later edit — they hold the editor `value` and
  commit it themselves; the upload items hand off to the existing upload flow,
  which already records its own edits. `turnInto` refuses voids, like the
  block menu. Default items are built on the same API.
- Defaults: paragraph, H1–H3, quote, code, bullet, numbered, checklist,
  divider, and image/file when `upload` is set (opens the existing picker).
- Implementation: lift the trigger detection, open/active/anchor state and the
  listbox shell out of the mention code into shared internals; mention and
  slash both use them. Same ARIA as mentions (textbox `aria-controls` /
  `aria-activedescendant`, `role="listbox"`), plus a "No matches" option row.

### Shared editing / stored format

New ids come from `createBlockId` through the existing `renameNewBlocks`. Docs
gain a "Stored format" section listing every block type and attribute, flagging
the new ones (`divider`, `checklist_item` + `checked`, `code_block.language`)
so eocrm extends its Yjs schema.

### i18n

New keys (en + ru): divider, checklist, inline code, code language label + each
language label that isn't a proper name ("Plain text"), copy/copied (reuse
CodeBlock's if present), checklist item fallback label, slash menu label,
group names, item hints, "No matches".

### Docs and playground

RichTextEditor.md / RichText.md (blocks list, input rules, shortcuts, slash
menu, `onToggleCheck`, Stored format), AI-PRIMER line if its summary changes,
`npm run build:docs`. Playground RichTextEditor demo gains a wiki-style
example with `slashMenu` on and the new blocks.

## Left to the builder

Icon choices; exact CSS of the checkbox row and the language picker; how the
PHP grammar is written; test placement per the package's test rules.
