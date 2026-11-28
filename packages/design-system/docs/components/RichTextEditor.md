# `<RichTextEditor>` — controlled rich-text editor (contentEditable)

Controlled WYSIWYG over the in-house engine. `value: RichDoc` + `onChange: (doc) => void` (feed it back into `value`). Blocks: paragraph, H1–H3, bullet/numbered/checklist items (nested by `depth`), quote, code block (with a language), divider, attachment. Type to edit; ⌘/Ctrl+B/I/U, ⌘/Ctrl+⇧X and ⌘/Ctrl+E toggle bold/italic/underline, strike and inline code over a selection; Enter splits, Backspace/Delete merge. Opt-in `slashMenu` adds a `/` insert menu.

```tsx
const [doc, setDoc] = useState(emptyDoc());
// Plain editor (keyboard shortcuts only)
<RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />;

// With built-in formatting toolbar
<RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `RichDoc` | yes | Controlled document. Render the doc returned by `onChange` back into `value` as-is, right away — a cloned/normalized copy reads as an outside replacement and resets undo history; one stored only after a later edit (debounced, or a deferred render the next keystroke beats) is treated as rejected. Defer expensive consumers (preview, save), not `value`. |
| `invalid` | `boolean` | no | `aria-invalid` on the textbox. Field / SettingRow inject it. Default: `false`. |
| `required` | `boolean` | no | `aria-required` on the textbox. Field / SettingRow inject it. Default: `false`. |
| `onChange` | `(doc: RichDoc) => void` | yes | Fires with the new document after every edit. |
| `readOnly` | `boolean` | no | Non-editable: renders the content read-only (prefer `<RichText>` for pure display). |
| `placeholder` | `string` | no | Shown when the document is empty. |
| `autoFocus` | `boolean` | no | Focus the editor on mount. |
| `toolbar` | `false \| true \| 'auto'` | no | Render the built-in formatting toolbar above the editor — Undo/Redo buttons, mark toggle buttons (bold/italic/underline/strike/inline code), a block-type dropdown (paragraph/headings/quote/code/divider), and bullet/numbered/checklist list toggles. The toolbar dispatches through the same commit path the keyboard uses and reflects the active marks + current block of the live selection. Default `false` (keyboard-only). When `readOnly`, the toolbar renders disabled. `'auto'` shows the toolbar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (the link editor / mention menu / slash menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is NOT remounted as the bar appears or hides (the bar toggles in a stable shell), so there's no focus/selection loss. Use it for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling the show-on-focus logic and working around overlay focus theft. |
| `mentions` | `MentionsConfig` | no | Enable `@`-mention autocomplete. Supply `onQuery` to resolve candidates for the text typed after the trigger (default `@`); the editor renders a floating combobox and inserts a styled mention chip carrying the chosen item's `id`. Omit to disable mentions. See {@link MentionsConfig}. |
| `slashMenu` | `boolean \| RichTextSlashMenuOption` | no | Enable the `/` insert menu: typing `/` at the start of a paragraph or heading (or after a space) opens a filterable list of blocks — paragraph, headings, quote, code, lists, checklist, divider, and image/file when `upload` is set. Arrow keys move, Enter picks, Escape closes and keeps the typed text. Picking an item (plus removing the typed `/query`) is one undo step. Pass `{ items: (defaults) => [...] }` to filter, reorder or add items (e.g. templates that call `api.insertBlocks`). Off by default; never opens in code blocks, read-only editors or during IME composition. See {@link SlashItem}. Default: `false`. |
| `autolink` | `boolean` | no | Turn typed and pasted URLs into links automatically. While typing, a URL is linked when you type a space after it; on paste, plain-text URLs are linked (a single bare URL pasted over a selection links the selection). Default `true`. Set `false` to disable both the type rule and paste autolinking (the ⌘/Ctrl+K link tool still works). The href is sanitized — only safe schemes (http/https/`www.`) become links. |
| `renderLink` | `RenderLink` | no | Substitute how a link renders. Called per link with `{ href, text }` and the default `<a>`; return your own node (e.g. a task/member chip) or the `defaultNode` to keep the standard anchor. A custom node renders as a non-editable **atomic chip** — the caret steps over it and a single Backspace/ Delete removes the whole link. |
| `renderMention` | `RenderMention` | no | Substitute how an `@`-mention renders. Called per mention with `{ id, label }` and the default mention span; return your own node (e.g. an interactive member chip / popover trigger) or the `defaultNode` to keep the standard non-interactive span. A custom node renders as a non-editable **atomic chip** — the caret steps over it as a single unit. Composes with `renderLink` (both usable together). |
| `imageMaxHeight` | `number` | no | Maximum DISPLAYED height of image attachments, in px. Default: the `--size-rich-text-image-max-height` token (480px). A taller image shrinks (width follows, aspect preserved); the resize handle and width slider stop where the image hits the cap. Render-time only — stored `width`/`height` are unchanged. Pass the same value to the read-only `<RichText>` so both agree. |
| `blockControls` | `boolean` | no | Show Notion-style per-block controls: a left gutter that appears on the hovered/focused block with an insert button (`＋`, adds an empty paragraph below) and a drag handle (`⠿`) that opens a block menu (Turn into ▸, Duplicate, Move up/down, Delete). Reordering is subtree-aware for nested lists. Keyboard: Shift+F10 / the ContextMenu key opens the focused block's menu; ⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓ move the block; ⌘/Ctrl+D duplicates. Default `false`. Ignored when `readOnly`. Independent of `toolbar`. |
| `upload` | `UploadConfig` | no | Enable file upload: a toolbar button (when `toolbar`) and clipboard-file paste. `onUpload(file)` resolves with where the file landed; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error; reject with `new UploadError(message)` to also show that (user-facing, localized) reason on the block — any other rejection shows only "Upload failed". `onUploadingChange` fires while any upload is in flight — wire it to your submit button's disabled state. Validation (size/type) belongs in `onUpload` (`accept` is only a native-picker hint and is bypassed by paste). Omit to disable. Ignored when `readOnly`. When `blockControls` is also on, a ready image attachment can be configured (alt text, alignment, replace, open/download) via the block menu's "Configure" item. The width slider appears only for an image that renders as a preview (a safe, fetchable src — an embed); an uploaded image whose object-URL src renders as a download chip isn't resizable here. Alignment + width round-trip through HTML but not Markdown. |
| `history` | `'internal' \| 'external'` | no | Who keeps the undo history. `'internal'` (default): the editor's own. `'external'`: a sync layer's (e.g. per-user undo over a shared doc) — the editor keeps none, sends ⌘Z / ⌘⇧Z / menu undo and the toolbar buttons to `onUndo` / `onRedo`, and accepts an outside `value` as-is (never a rejected edit or a history reset), keeping the caret where `controller.setSelection` puts it (default: the current selection, clamped to the new doc). |
| `onUndo` | `(() => void)` | no | Undo, with `history="external"` (keyboard, menu and toolbar). |
| `onRedo` | `(() => void)` | no | Redo, with `history="external"` (keyboard, menu and toolbar). |
| `canUndo` | `boolean` | no | Whether the toolbar's Undo button is enabled, with `history="external"`. Default: `false`. |
| `canRedo` | `boolean` | no | Whether the toolbar's Redo button is enabled, with `history="external"`. Default: `false`. |
| `onEdit` | `((edit: { kind: RichTextEditKind; }) => void)` | no | Fires once per local edit, right before its `onChange`, with its kind (see {@link RichTextEditKind}; `'silent'` edits are not undo steps). Not fired for undo / redo. |
| `createBlockId` | `(() => string)` | no | Id source for every block the editor creates (Enter, paste, insert, duplicate, attachments), per editor instance. Use it when ids must be unique across users of a shared doc (e.g. prefix a client id). Omit for session-unique `rtN` ids. |
| `onSelectionChange` | `((selection: RichRange \| null) => void)` | no | Fires on every selection change with the model selection, and with `null` when the editor loses focus or the selection leaves it. Relay it (throttled) as this user's presence. |
| `controller` | `Ref<RichTextEditorController>` | no | Receives the {@link RichTextEditorController} for a sync layer. |
| `onCompositionEnd` | `(() => void)` | no | Fires after the editor committed an IME composition (and its `onChange`): if remote changes arrived during it, rebuild the doc once from your shared state now and pass it as `value`. |
| `presence` | `readonly RichTextPresence[]` | no | Other users in a shared doc: drawn as carets with a name flag and selection tints in each user's colour (hidden from assistive tech), and named in the status area's accessible text ("2 others editing: …", one per `id` with a non-empty name; nameless peers are drawn but not counted). Leave out the local user. Setting it (or `syncStatus`) wraps the editable in a root element that holds the overlay and status, so set it from the first render (`[]` while nobody else is there): switching it between `undefined` and set remounts the editable when neither `toolbar` nor `blockControls` already wraps it. |
| `syncStatus` | `'synced' \| 'connecting' \| 'offline'` | no | Connection state of the app's sync transport, shown as a small text + icon indicator in the toolbar row (`toolbar={true}`) or below the editable, and announced politely on change. Omit to show none. Set it from the first render (e.g. `'connecting'`): going from `undefined` to set announces nothing (the live region mounts with it) and, like `presence`, can remount the editable. |
| `uploadOwner` | `((blockId: string) => RichTextUploadOwner)` | no | Who owns each in-flight or failed upload in a shared doc (see {@link RichTextUploadOwner}): `'orphaned'` shows "Upload interrupted" with Remove; Retry appears only for `'mine'`. Omit and every failed upload offers Retry, and none reads as interrupted. Its identity drives re-rendering: pass a new function whenever ownership changes (e.g. `useMemo` on presence). |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

**`toolbar` prop** (`boolean | 'auto'`, default `false`): renders a formatting bar above the editor surface. `toolbar="auto"` shows the bar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (link editor / mention menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is not remounted as the bar appears/hides (no focus/selection loss). Use `'auto'` for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling show-on-focus + overlay-focus handling. The toolbar contains:

- **Mark buttons** — Bold, Italic, Underline, Strikethrough, Inline code. Reflect `aria-pressed` based on the current selection (or pending marks at a collapsed caret). Clicking with a selection toggles the mark over it; clicking at a collapsed caret sets a "pending" mark applied to the next typed characters (then clears). Applying inline code strips bold/italic/underline/strike and text/highlight colour from the range (links stay); while the selection is entirely code those buttons are disabled. Existing stored documents are never normalised — a code+bold run already in a doc keeps rendering.
- **Block-type dropdown** — Paragraph, Heading 1–3, Quote, Code block, plus a Divider item that inserts a divider (a divider is not a "Turn into" target — it holds no text). Shows the current block type; mixed multi-block selections show "Mixed".
- **List toggles** — Bullet list, Numbered list, Checklist. Toggle between the list type and paragraph.
- **Link button** — add/edit a link on the selection. Reflects `aria-pressed` when the caret is inside a link.
- **Emoji insert** — opens a searchable `EmojiPickerPopover`; selecting an emoji inserts it at the caret.
- **Color** — two separate pickers, **Text color** and **Highlight**, each its own toolbar button (and its own ⠿-menu submenu when `blockControls` is enabled). Each picker is a grid of small **named badges** (the Palette-demo chip look — subtle bg fill + strong fg text): the default brand colors first (gray + semantic red/green/amber/blue, backed by the `--color-fg-muted`/`--color-danger`/`--color-success`/`--color-warning`/`--color-accent` tokens), then the rest of the categorical palette (each palette extra uses its `-fg`/`-bg` token), led by a Default/clear badge. Applied to the selection from the toolbar, or to a whole block from the ⠿ menu. Colors round-trip through HTML and are dropped in Markdown.
- **Undo / Redo buttons** — undo/redo the last change; disabled at the ends of the history.

**List keys:**

- `Enter` on an empty list item exits the list (converts to paragraph). Enter on a checklist item starts an unchecked one.
- `Tab` / `Shift+Tab` indent and outdent list items (clamped at depth 0). Checklist, bullet and numbered items nest under each other freely; at the same depth a switch to or from a checklist starts a new list (so a numbered run interrupted by a checklist restarts at 1, as GFM renders it).

**Checklist:** each item has a native checkbox beside its text (named by the text; "Checklist item" when empty). Clicking it toggles `checked` as one undo step (`onEdit` kind `'other'`) and keeps focus in the editor. From the keyboard, ⌘/Ctrl+Enter with the caret in an item toggles it (one undo step; with a selection over several items, each is set to the inverse of the first item's state) — Tab indents in a list, so it never reaches the checkbox. Neither works when `readOnly`, and ⌘/Ctrl+Enter does nothing while the slash or mention menu is open (only plain Enter/Tab pick there). The checkbox is disabled when `readOnly`.

**Code blocks:** while the caret is in a code block, a compact language picker sits in a strip at the block's top-end corner — "Plain text" (no `language`) first, then JavaScript, TypeScript, JSON, PHP, Python, SQL, Bash, YAML, HTML, CSS, Markdown, Go, Kotlin, Java, C#, Rust. Changing it is one undo step. Code with a known language is syntax-highlighted; the highlighter (Prism) loads lazily on first use, so the first paint is plain text. Keys in a code block: `Tab` inserts two spaces at a caret (indents the selected lines with a selection), `Shift+Tab` outdents. **Escape, then Tab** leaves the editor (focus moves on to the language picker, then out) — the APG pattern for editors that capture Tab; Escape then Tab works the same way in lists. Inside a `Modal` / `Drawer`, the first Escape in a code block or list item stays with the editor (it arms Tab-out); the next Escape closes the dialog.

**Pending marks:** toggling a mark at a collapsed caret (via toolbar or ⌘B/I/U/⌘⇧X shortcut) queues it; the next inserted text gets that mark applied, then the queue clears. Moving the caret discards pending marks (with or without a toolbar).

**`blockControls` prop** (opt-in, default off): Notion-style per-block gutter — `＋` insert below, drag the gutter (the whole strip) to reorder with an in-place reflow (subtree-aware for nested lists) + a block menu (turn into / duplicate / move up·down / delete). Reorder/duplicate/delete are subtree-aware for nested lists (a list item carries its nested children); **turn-into acts on the single anchor block only** (idempotent — choosing the current type is a no-op). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑·↓ move, ⌘/Ctrl+D duplicate. Independent of `toolbar`; ignored when `readOnly`. All ops route through `value`/`onChange` and are undoable.

**`upload` prop** (opt-in): file upload via a toolbar button (when `toolbar`) + clipboard-file paste. `upload={{ onUpload, accept?, onUploadingChange? }}` — `onUpload(file)` resolves `{ url, name?, mime?, width?, height?, alt? }`; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error; reject with `new UploadError(message)` (exported) to show that reason on the block — write it for end users, localized. Any other rejection shows only "Upload failed", so raw `Failed to fetch` / HTTP-client messages never leak. A failure is also announced to screen readers through a polite live region ("Upload failed: {file}. {reason}"), since it usually lands while the user is typing elsewhere; the read-only `<RichText>` shows a failed block's text without Retry/Remove. Wire `onUploadingChange(uploading)` to your submit button's disabled state. Validate size/type inside `onUpload` (the picker `accept` is a hint only; paste bypasses it). Uploaded files are void **attachment blocks** — `blockControls` can reorder/duplicate/delete them. With the caret on an attachment (e.g. after an image that ends the doc), typing or Enter continues in a new paragraph after it — even from a caret before the image, since the model has one position per attachment; Backspace from after it (or Delete from before it) removes it; Backspace from before it (or Delete from after it) only moves the caret into the neighboring block — unless that block is empty or another attachment, which is removed instead (the caret stays put). Stored doc JSON round-trips losslessly; HTML import maps `<img>` → an image attachment (Markdown image import is not supported). Ignored when `readOnly`. Ready image attachments are configurable via the block-menu's "Configure" item (requires `blockControls`): alt text, alignment, replace-in-place, open/download — plus a width slider **only** when the image renders as a preview (a safe, fetchable src — an embedded/imported image); an uploaded image whose object-URL src renders as a download chip isn't resizable here. A previewable image also gets a drag handle on its bottom-right corner (pointer only — keyboard/AT users use the Width slider); both the slider and the handle resize the image **live** and a whole drag is one undo step. Alignment + width persist in the doc and serialize to HTML; Markdown drops them. A newly uploaded/pasted image is laid out at its **perceived** size — natural pixels ÷ device pixel ratio, capped to the editor width — so a retina screenshot isn't inserted at 2× the size you saw; image **display height** is capped (`imageMaxHeight`, default 480px via `--size-rich-text-image-max-height`) — a tall photo shrinks with its aspect kept, the resize handle / width slider stop at the cap, and stored `width`/`height` are untouched (pass the same `imageMaxHeight` to the read-only `<RichText>`); return natural `width`/`height` from `onUpload` (or omit them and the editor measures the file). Persisted/imported image blocks (whose transient upload `status` is dropped on save) stay fully editable — the resize handle and the "Configure" popover treat "ready **or** status-absent" as settled, so editing an existing image comment works exactly like the brand-new composer.

**Links:** select text and press ⌘/Ctrl+K (or the toolbar link button) to add or edit a link; with the caret inside a link the URL is pre-filled and a Remove button appears; with no selection the URL is inserted as linked text. Esc / click-outside cancels. Stored hrefs are sanitized at render time (`safeHref` blocks `javascript:`/`data:`/protocol-relative).

**Autolink** (`autolink` prop, default `true`): typing a URL followed by a space, or pasting text containing a URL, turns it into a `link` mark automatically (`http(s)://…` or a bare `www.…` host; unsafe schemes are left as plain text). Set `autolink={false}` to disable both the type rule and paste autolinking.

**`renderLink`** (optional, same `RenderLink` as `<RichText>`): preview links inline — the consumer checks "is this URL in my space?" and returns a chip or the `fallback` `<a>`. In the editor a substituted link becomes an **atomic chip**: the caret sits before/after it (arrow keys step over it, never inside) and Backspace deletes the whole chip in one step. It's render-time only — `toHtml`/`toMarkdown` and the model still emit a plain link, so serialization is unchanged. Don't do heavy synchronous work inside it.

**`renderMention`** (optional, same `RenderMention` as `<RichText>`): `(mention: { id, label }, defaultNode) => ReactNode` — same contract as `renderLink` but for `@`-mention marks (render an interactive member chip/popover trigger); composes with `renderLink`. A substituted mention becomes an **atomic chip** the caret steps over as one unit. Render-time only — `toHtml`/`toMarkdown` and the model still emit the mention mark.

```tsx
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = /^https?:\/\/app\.eocrm\/task\/(\d+)/i.exec(href);
  return m ? <Badge tone="purple">#{m[1]}</Badge> : fallback;
};
// autolink is on by default; type/paste a URL to link it
<RichTextEditor value={doc} onChange={setDoc} toolbar renderLink={renderLink} />;
```

**Import:** `fromHtml(html)` and `fromMarkdown(md)` parse a string into a `RichDoc` (e.g. to seed `value` from stored/legacy content). Pasting rich HTML into the editor imports it as formatted content (parsed + sanitized). Markdown import is via `fromMarkdown` only — pasted plain text (incl. Markdown source) inserts literally, except that bare URLs in pasted plain text autolink (see Autolink above). Both `from*` functions require a DOM environment (`DOMParser`); Markdown has no underline syntax and images/tables aren't modeled. Wave-2 blocks map both ways: divider ↔ `<hr>` / `---` (also `***`, `___` on import); checklist ↔ `<ul data-type="checklist"><li data-checked="true|false"><input type="checkbox" …>text</li></ul>` / `- [ ] text`, `- [x] text` (indent = depth; `fromHtml` also accepts GitHub-style `<li><input type="checkbox">` in any `<ul>`); code language ↔ `<pre><code class="language-x">` (`lang-x` is accepted on import) / the fence info string. Imported language names are normalised (see Stored format).

**Export:** `toHtml(doc)` and `toMarkdown(doc)` serialize a `RichDoc` back to a string (the inverse of `fromHtml`/`fromMarkdown`) — e.g. for storage, email bodies, or display outside the editor. `toHtml` is lossless (`fromHtml(toHtml(doc))` round-trips); `toMarkdown` drops underline (no Markdown syntax — use `toHtml` for full fidelity). Both escape output and run hrefs through `safeHref`.

**Mentions:** pass `mentions={{ onQuery }}` (optional `trigger`, default `@`) to
enable `@`-autocomplete. `onQuery(query)` returns `MentionItem[]` (`{ id, label,
description?, avatarUrl? }`), sync or async. Picking a candidate inserts a chip
carrying the `id`; chips survive `toHtml`/`fromHtml` round-trips but degrade to
plain `@label` text in `toMarkdown`. Chips are inert references, not links.

**Undo/redo:** built in — ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo, plus the toolbar Undo/Redo buttons. Typing coalesces into one step (short bursts), and replacing `value` from outside the editor clears the history.

**Input rules:** typing a Markdown marker + space at the start of a paragraph auto-converts the block (text already after the caret stays in the converted block). One Undo reverts the conversion.

<!-- prettier-ignore -->
| Type | Result |
|---|---|
| `# ` / `## ` / `### ` | Heading 1 / 2 / 3 |
| `- ` / `* ` / `+ ` | Bullet list item |
| `1. ` (or `1) `) | Numbered list item |
| `> ` | Quote |
| ` ``` ` + space | Code block |
| `[] ` / `[ ] ` | Checklist item, unchecked |
| `[x] ` / `[X] ` | Checklist item, checked |
| `---` + space, or `---` + Enter | Divider inserted before the block (Enter fires only when `---` is all the block holds) |
| `` `text`` then a closing `` ` `` | Inline code over `text` (backticks dropped; one undo step). A lone or doubled backtick does nothing. Not inside code blocks. |

**Shortcuts:** ⌘/Ctrl+B bold, I italic, U underline, ⇧X strike, E inline code, K link; ⌘/Ctrl+Z undo, ⌘/Ctrl+⇧Z or ⌘/Ctrl+Y redo; ⌘/Ctrl+Enter toggles the checklist item(s) at the caret. In lists, Tab / Shift+Tab indent and outdent; in code blocks they indent and outdent lines; Escape then Tab leaves the editor.

**Slash menu** (`slashMenu`, off by default): typing `/` at the start of a paragraph or heading, or after whitespace, opens a filterable list grouped Text · Lists · Media · Advanced. It never opens in code blocks, during IME composition or when `readOnly`. Typing filters by label and `keywords`; Arrow keys move, Enter (or Tab) picks, Escape closes and leaves the typed `/text`; with no match a "No matches" row shows and Enter types normally. Defaults: Paragraph, Heading 1–3, Quote, Bullet list, Numbered list, Checklist, Code block, Divider — plus Image and File when `upload` is set (they open the upload picker). Picking an item, together with removing the typed `/query`, is one undo step (`onEdit` kind `'other'`). It shares the mention menu's ARIA (the textbox's `aria-controls` / `aria-activedescendant`, a `role="listbox"`). With `toolbar="auto"` the bar stays visible while the menu is open.

Pass `{ items: (defaults) => SlashItem[] }` to filter, reorder or extend. A `SlashItem` is `{ id, group, label, hint?, icon?, keywords?, run }`; `run(api)` gets a `SlashApi`: `blockId` (the block that held the `/`, already stripped of `/query`), `turnInto({ type, level? })` (like the block menu's "Turn into"; void targets are refused), `insertBlocks(blocks)` (insert after that block, or replace it when it's empty; ids are reassigned through `createBlockId`; a trailing void gets a paragraph after it) and `openUpload('image' | 'file')`. `label` / `hint` are shown as given — pass translated strings.

```tsx
const slashMenu: RichTextSlashMenuOption = {
  items: (defaults) => [
    ...defaults.filter((i) => i.id !== 'quote'),
    {
      id: 'crm-record',
      group: 'advanced',
      label: t('wiki.linkRecord'), // "Link to a CRM record"
      hint: t('wiki.linkRecordHint'),
      keywords: ['deal', 'record'],
      run: (api) =>
        api.insertBlocks([
          {
            ...createBlock('paragraph'),
            inlines: [
              { text: 'Related deal: ', marks: [] },
              { text: deal.name, marks: [{ type: 'link', href: `/deals/${deal.id}` }] },
            ],
          },
        ]),
    },
  ],
};
<RichTextEditor value={doc} onChange={setDoc} toolbar slashMenu={slashMenu} />;
```

`run` is synchronous. Something that needs a fetch (a template from the server) is your own later edit: you hold `value`, so build the new doc when the data arrives and pass it in.

Read-only display of an existing document: `<RichTextEditor value={doc} onChange={() => {}} readOnly />` (or use `<RichText>`). `@`-mentions: `<RichTextEditor value={doc} onChange={setDoc} mentions={{ onQuery: (q) => searchUsers(q) }} />`.

**Shared editing (sync hooks):** the props `history`, `onUndo`/`onRedo`/`canUndo`/`canRedo`, `onEdit`, `createBlockId`, `onSelectionChange`, `controller`, `onCompositionEnd`, `presence`, `syncStatus` and `uploadOwner` let a sync layer (e.g. a CRDT) drive the editor. The library ships no sync engine and no yjs dependency; the Yjs binding lives in the app.

- **`history="external"`**: the editor keeps no undo stack. ⌘Z / ⌘⇧Z, the menu and the toolbar buttons call `onUndo` / `onRedo`; enable the toolbar buttons with `canUndo` / `canRedo`. An outside `value` is accepted as-is (never a rejected edit, no history reset) and the caret stays where it was (clamped to the new doc) unless `controller.setSelection` moves it. `onEdit({ kind })` fires once per local edit right before `onChange`, with `kind` one of `'type'` (typing), `'delete'`, `'resize'` (an image width drag), `'other'` (formatting, Enter, paste, block actions, insert) or `'silent'` (an upload settling or a failed upload's removal). Group consecutive edits of the same kind into one undo step, never group `'other'`, and keep `'silent'` out of the undo stack.
- **`controller`** (a ref to `RichTextEditorController`): `getSelection()` returns the editor's selection, `setSelection(range)` sets the caret the next `value` gets (map it through remote changes yourself), `isComposing()` is `true` during an IME composition. While composing, don't pass outside values (replacing the DOM mid-composition breaks the IME): skip them and, in `onCompositionEnd`, rebuild once from your shared state. Inside `onEdit`, `getSelection()` is still the pre-edit caret: store it with the undo step so undo can put the caret back. Outside values and `setSelection` never move focus: whenever focus is outside the editable (anywhere, not just the editor's menus), their caret is held and placed when the editable regains focus.
- **Applying a remote change** (`rebuild`, `mapCaret` and `setValue` are your app's own functions; this assumes your `onChange` writes local edits into the shared state synchronously):

  ```ts
  let dirty = false;
  // on a remote update: never replace the doc mid-composition
  if (controller.current?.isComposing()) dirty = true;
  else apply();
  // onCompositionEnd={() => dirty && apply()} — the shared state now holds the composed text
  function apply() {
    dirty = false;
    const next = rebuild(sharedState); // once, from the current shared state
    // The caret is in the coordinates of the doc the editor shows (`shown`), not of `next`:
    // map it across that change (with Yjs: via relative positions captured before applying).
    controller.current?.setSelection(mapCaret(controller.current.getSelection(), shown, next));
    setValue(next); // after setSelection
  }
  ```

- **Local transactions**: with `history="external"`, pass `onChange`'s exact object back as `value` (not a doc rebuilt from your shared state) — the editor tells its own edits from outside values by identity.
- **`createBlockId`**: id source for every block the editor creates; the ids are applied before `onChange` sees the doc. Use it when ids must be unique across users (prefix a client id).
- **`presence`**: other users as `{ id, name, color, selection }`, drawn as carets, name flags and selection tints (hidden from assistive tech) and named in the status text. Leave out the local user. Feed your own `onSelectionChange` (throttled) to the peers.
- **`syncStatus`** (`'synced' | 'connecting' | 'offline'`): small indicator, announced politely on change; the initial value is not announced.
- **`uploadOwner(blockId)`**: `'mine'` | `'theirs'` | `'orphaned'`. Retry shows only for `'mine'`; `'orphaned'` reads "Upload interrupted". Pass a new function whenever ownership changes.
- Set `history`, `presence` and `syncStatus` from the first render (`presence={[]}` while alone); switching them at runtime is unsupported — toggling `presence` / `syncStatus` between `undefined` and set remounts the editable when neither `toolbar` nor `blockControls` wraps it.

```tsx
// One editor + an app-owned undo/redo stack (toy whole-document history; a real app syncs ops).
const [doc, setDoc] = useState(emptyDoc());
const [undo, setUndo] = useState<RichDoc[]>([]);
const [redo, setRedo] = useState<RichDoc[]>([]);
const [sel, setSel] = useState<RichRange | null>(null); // local user's selection, relayed to peers
const change = (d: RichDoc) => {
  setUndo((u) => [...u, doc]);
  setRedo([]);
  setDoc(d); // the exact object onChange gave
};
<RichTextEditor
  value={doc}
  onChange={change}
  history="external"
  onUndo={() => {
    const prev = undo.at(-1);
    if (!prev) return;
    setUndo(undo.slice(0, -1));
    setRedo([...redo, doc]);
    setDoc(prev);
  }}
  onRedo={() => {
    const next = redo.at(-1);
    if (!next) return;
    setRedo(redo.slice(0, -1));
    setUndo([...undo, doc]);
    setDoc(next);
  }}
  canUndo={undo.length > 0}
  canRedo={redo.length > 0}
  createBlockId={() => `${clientId}-${crypto.randomUUID()}`}
  onSelectionChange={setSel}
  presence={[{ id: 'bob', name: 'Bob', color: 'var(--color-success)', selection: bobSel }]}
  syncStatus="synced"
/>;
```

## Stored format

The editor's `value` is the stored format: a `RichDoc` is `{ blocks: Block[] }`, an ordered, **flat** list (no block tree — lists nest by `depth`). Store it as JSON; `toHtml` / `toMarkdown` are exports, not the source of truth. **New in wave 2** rows are new stored shapes: a sync layer with its own schema (e.g. eocrm's Yjs mapping) must add them or it will drop them.

<!-- prettier-ignore -->
| Block `type` | Attributes (besides `id`, `type`, `inlines`) | Notes |
|---|---|---|
| `paragraph` | — | |
| `heading` | `level`: `1 \| 2 \| 3` | |
| `bullet_item` | `depth`: 0-based nesting | |
| `ordered_item` | `depth` | Numbering is derived from position, not stored. |
| `checklist_item` — **new in wave 2** | `depth`; `checked`: `boolean` (absent = unchecked) | |
| `blockquote` | — | |
| `code_block` | `language` — **new in wave 2**: absent = plain text | Inline marks inside it aren't rendered or serialized. |
| `divider` — **new in wave 2** | — | Void: `inlines` is a single empty run. |
| `attachment` | `src`, `name`, `mime`, `width`, `height`, `alt`, `align`: `'left' \| 'center' \| 'right'`; transient `status`: `'uploading' \| 'ready' \| 'error'` and `uploadError` | Void. `status`/`uploadError` exist only while an upload is in flight or failed; such blocks never serialize to HTML/Markdown. |

`code_block.language` holds a canonical name: `javascript`, `typescript`, `json`, `php`, `python`, `sql`, `bash`, `yaml`, `html`, `css`, `markdown`, `go`, `kotlin`, `java`, `csharp`, `rust`. HTML/Markdown import lower-cases and normalises aliases — `js`, `jsx` → `javascript`; `ts`, `tsx` → `typescript`; `sh`, `shell`, `zsh` → `bash`; `py` → `python`; `yml` → `yaml`; `md` → `markdown`; `cs`, `c#` → `csharp`; `kt` → `kotlin`; `rs` → `rust`; `htm`, `xml` → `html` — and stores no attribute for `plain` / `text` / `plaintext`. Any other value is stored as-is (lower-cased), rendered plain and round-tripped unchanged.

Each `inlines` entry is `{ text, marks }`. Marks: `bold`, `italic`, `underline`, `strike`, `code`, `link` (`href`), `mention` (`id`, `label`), `textColor` / `bgColor` (`color`: a palette key such as `'red'`, never a raw value). The inline `code` mark is not new to the model, but before wave 2 only paste/import produced it; now the editor creates it (⌘/Ctrl+E, the toolbar, the backtick rule), so a sync schema that skipped it must add it. Applying it strips the other formatting marks from the range at edit time; stored documents are never rewritten.

UI state is not stored: the slash menu, the language picker, open menus, Escape-then-Tab, the caret. Nothing in the doc records whether something is open or focused.

**Anti-patterns**

- ❌ Treating it as uncontrolled — you MUST feed `onChange`'s doc back into `value`, or edits won't stick. Never mutate `value` in place.
- ❌ Storing `onChange`'s doc later (debounced / `setTimeout` / after an `await`), or deferring `value` itself (`startTransition` / `useDeferredValue` on the editor's doc) — every edit builds on the current `value`, so the next keystroke can beat the late update and drop text. Store it right away; defer the expensive consumers (preview, autosave) instead. An edit whose doc hasn't arrived as `value` by the next edit, undo or upload settle is treated as rejected: its undo step is dropped and its caret isn't restored.
- ❌ Cloning or normalizing the doc in `onChange` before storing it (`setDoc(structuredClone(d))`, a re-parse, an immutable-library copy) — the editor detects an outside `value` replacement by object identity, so a copy wipes undo history on every keystroke. Store the exact object `onChange` gave you; transform only on save.
- ❌ Toggling `presence` / `syncStatus` between `undefined` and set at runtime — it can remount the editable (focus and caret lost); set them from the first render.
- ❌ `history="external"` without `onUndo` / `onRedo` — ⌘Z and the toolbar buttons do nothing.
- ❌ Non-unique ids from `createBlockId` (a bare counter shared across users) — blocks collide in the shared doc; prefix a client id.
- ❌ Implementing your own undo/redo stack (except with `history="external"`) — history is tracked internally (⌘/Ctrl+Z, ⌘/Ctrl+⇧Z or ⌘/Ctrl+Y, toolbar buttons).
- ❌ Hand-rolling a link UI or a toolbar by reaching into the DOM — press ⌘/Ctrl+K or pass `toolbar`; both route through the controlled `value`/`onChange` round-trip.
- ❌ Pre-stripping pasted HTML to plain text — paste rich HTML directly; the editor parses it (sanitized) into the model. Seed stored content with `fromHtml` / `fromMarkdown`.
- ❌ Hand-rolling HTML/Markdown from the model — use `toHtml` / `toMarkdown`.
- ❌ Using mentions or `renderMention` for plain links — that is the link tool (⌘K) / `renderLink`. A mention chip is an inert reference carrying an `id`, not a navigable anchor; the two compose.
- ❌ Returning thousands of unfiltered items from `onQuery` — filter server-side (or by `query`); the menu renders what you return.
- ❌ Relying on Markdown to preserve mentions — `toMarkdown` is lossy (plain `@label`); use `toHtml`/`fromHtml` to round-trip the id.
- ❌ Building a custom block drag/menu by reaching into the DOM — pass `blockControls`; insert/move/duplicate/delete route through `value`/`onChange` and are undoable.
- ❌ Expecting Backspace to delete a whole block — it edits text; use the block menu's Delete (or select the block's text and delete).
- ❌ Persisting or submitting the doc while an upload is in flight — gate your submit on `upload.onUploadingChange` (transient attachment blocks are skipped by `toHtml`/`toMarkdown`, but the model still carries them until they settle).
- ❌ Relying on the picker `accept` for validation — it is only a hint and paste bypasses it; enforce size/type inside `onUpload` and reject to show an error.
- ❌ Expecting image alignment/width to survive a Markdown round-trip — they serialize to HTML only; the stored RichDoc JSON is lossless.
- ❌ `slashMenu` together with `mentions={{ trigger: '/' }}` — both menus claim `/`. Keep mentions on `@` (the default) when the slash menu is on.
- ❌ Async work inside `SlashItem.run` (`await fetch(...)` then `api.insertBlocks`) — `run` is synchronous and the API is only valid during that call. Insert a placeholder or nothing, fetch, then commit the result yourself through `value`.
- ❌ Storing aliases or display names in `code_block.language` when you build docs by hand (`'ts'`, `'TypeScript'`) — store the canonical name (`'typescript'`); only import normalises.
- ❌ Syncing the doc through a schema that only knows the pre-wave-2 block types — `divider`, `checklist_item` / `checked` and `code_block.language` are silently lost. Extend the schema (see Stored format).

When NOT to use: read-only display → `<RichText>`. It's controlled — render `onChange`'s doc back into `value`, never mutate in place.
