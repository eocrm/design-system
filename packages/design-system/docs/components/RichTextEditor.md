# `<RichTextEditor>` — controlled rich-text editor (contentEditable)

Controlled WYSIWYG over the in-house engine. `value: RichDoc` + `onChange: (doc) => void` (feed it back into `value`). Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a selection; Enter splits, Backspace/Delete merge.

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
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `RichDoc` | yes | — | Controlled document. Render the doc returned by `onChange` back into `value`. |
| `invalid` | `boolean` | no | false | `aria-invalid` on the textbox. Field / SettingRow inject it. |
| `required` | `boolean` | no | false | `aria-required` on the textbox. Field / SettingRow inject it. |
| `onChange` | `(doc: RichDoc) => void` | yes | — | Fires with the new document after every edit. |
| `readOnly` | `boolean` | no | — | Non-editable: renders the content read-only (prefer `<RichText>` for pure display). |
| `placeholder` | `string` | no | — | Shown when the document is empty. |
| `autoFocus` | `boolean` | no | — | Focus the editor on mount. |
| `toolbar` | `boolean \| "auto"` | no | — | Render the built-in formatting toolbar above the editor — Undo/Redo buttons, mark toggle buttons (bold/italic/underline/strike), a block-type dropdown (paragraph/headings/quote/code), and bullet/numbered list toggles. The toolbar dispatches through the same commit path the keyboard uses and reflects the active marks + current block of the live selection. Default `false` (keyboard-only). When `readOnly`, the toolbar renders disabled. `'auto'` shows the toolbar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (the link editor / mention menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is NOT remounted as the bar appears or hides (the bar toggles in a stable shell), so there's no focus/selection loss. Use it for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling the show-on-focus logic and working around overlay focus theft. |
| `mentions` | `MentionsConfig` | no | — | Enable `@`-mention autocomplete. Supply `onQuery` to resolve candidates for the text typed after the trigger (default `@`); the editor renders a floating combobox and inserts a styled mention chip carrying the chosen item's `id`. Omit to disable mentions. See {@link MentionsConfig}. |
| `autolink` | `boolean` | no | — | Turn typed and pasted URLs into links automatically. While typing, a URL is linked when you type a space after it; on paste, plain-text URLs are linked (a single bare URL pasted over a selection links the selection). Default `true`. Set `false` to disable both the type rule and paste autolinking (the ⌘/Ctrl+K link tool still works). The href is sanitized — only safe schemes (http/https/`www.`) become links. |
| `renderLink` | `RenderLink` | no | — | Substitute how a link renders. Called per link with `{ href, text }` and the default `<a>`; return your own node (e.g. a task/member chip) or the `defaultNode` to keep the standard anchor. A custom node renders as a non-editable **atomic chip** — the caret steps over it and a single Backspace/ Delete removes the whole link. |
| `renderMention` | `RenderMention` | no | — | Substitute how an `@`-mention renders. Called per mention with `{ id, label }` and the default mention span; return your own node (e.g. an interactive member chip / popover trigger) or the `defaultNode` to keep the standard non-interactive span. A custom node renders as a non-editable **atomic chip** — the caret steps over it as a single unit. Composes with `renderLink` (both usable together). |
| `blockControls` | `boolean` | no | — | Show Notion-style per-block controls: a left gutter that appears on the hovered/focused block with an insert button (`＋`, adds an empty paragraph below) and a drag handle (`⠿`) that opens a block menu (Turn into ▸, Duplicate, Move up/down, Delete). Reordering is subtree-aware for nested lists. Keyboard: Shift+F10 / the ContextMenu key opens the focused block's menu; ⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓ move the block; ⌘/Ctrl+D duplicates. Default `false`. Ignored when `readOnly`. Independent of `toolbar`. |
| `upload` | `UploadConfig` | no | — | Enable file upload: a toolbar button (when `toolbar`) and clipboard-file paste. `onUpload(file)` resolves with where the file landed; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error. `onUploadingChange` fires while any upload is in flight — wire it to your submit button's disabled state. Validation (size/type) belongs in `onUpload` (`accept` is only a native-picker hint and is bypassed by paste). Omit to disable. Ignored when `readOnly`. When `blockControls` is also on, a ready image attachment can be configured (alt text, alignment, replace, open/download) via the block menu's "Configure" item. The width slider appears only for an image that renders as a preview (a safe, fetchable src — an embed); an uploaded image whose object-URL src renders as a download chip isn't resizable here. Alignment + width round-trip through HTML but not Markdown. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

**`toolbar` prop** (`boolean | 'auto'`, default `false`): renders a formatting bar above the editor surface. `toolbar="auto"` shows the bar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (link editor / mention menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is not remounted as the bar appears/hides (no focus/selection loss). Use `'auto'` for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling show-on-focus + overlay-focus handling. The toolbar contains:

- **Mark buttons** — Bold, Italic, Underline, Strikethrough. Reflect `aria-pressed` based on the current selection (or pending marks at a collapsed caret). Clicking with a selection toggles the mark over it; clicking at a collapsed caret sets a "pending" mark applied to the next typed characters (then clears).
- **Block-type dropdown** — Paragraph, Heading 1–3, Quote, Code block. Shows the current block type; mixed multi-block selections show "Mixed".
- **List toggles** — Bullet list, Numbered list. Toggle between the list type and paragraph.
- **Link button** — add/edit a link on the selection. Reflects `aria-pressed` when the caret is inside a link.
- **Emoji insert** — opens a searchable `EmojiPickerPopover`; selecting an emoji inserts it at the caret.
- **Color** — two separate pickers, **Text color** and **Highlight**, each its own toolbar button (and its own ⠿-menu submenu when `blockControls` is enabled). Each picker is a grid of small **named badges** (the Palette-demo chip look — subtle bg fill + strong fg text): the default brand colors first (gray + semantic red/green/amber/blue, backed by the `--color-fg-muted`/`--color-danger`/`--color-success`/`--color-warning`/`--color-accent` tokens), then the rest of the categorical palette (each palette extra uses its `-fg`/`-bg` token), led by a Default/clear badge. Applied to the selection from the toolbar, or to a whole block from the ⠿ menu. Colors round-trip through HTML and are dropped in Markdown.
- **Undo / Redo buttons** — undo/redo the last change; disabled at the ends of the history.

**List keys:**

- `Enter` on an empty list item exits the list (converts to paragraph).
- `Tab` / `Shift+Tab` indent and outdent list items (clamped at depth 0).

**Pending marks:** toggling a mark at a collapsed caret (via toolbar or ⌘B/I/U/⌘⇧X shortcut) queues it; the next inserted text gets that mark applied, then the queue clears. Moving the caret discards pending marks.

**`blockControls` prop** (opt-in, default off): Notion-style per-block gutter — `＋` insert below, drag the gutter (the whole strip) to reorder with an in-place reflow (subtree-aware for nested lists) + a block menu (turn into / duplicate / move up·down / delete). Reorder/duplicate/delete are subtree-aware for nested lists (a list item carries its nested children); **turn-into acts on the single anchor block only** (idempotent — choosing the current type is a no-op). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑·↓ move, ⌘/Ctrl+D duplicate. Independent of `toolbar`; ignored when `readOnly`. All ops route through `value`/`onChange` and are undoable.

**`upload` prop** (opt-in): file upload via a toolbar button (when `toolbar`) + clipboard-file paste. `upload={{ onUpload, accept?, onUploadingChange? }}` — `onUpload(file)` resolves `{ url, name?, mime?, width?, height?, alt? }`; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error. Wire `onUploadingChange(uploading)` to your submit button's disabled state. Validate size/type inside `onUpload` (the picker `accept` is a hint only; paste bypasses it). Uploaded files are void **attachment blocks** — `blockControls` can reorder/duplicate/delete them. Stored doc JSON round-trips losslessly; HTML import maps `<img>` → an image attachment (Markdown image import is not supported). Ignored when `readOnly`. Ready image attachments are configurable via the block-menu's "Configure" item (requires `blockControls`): alt text, alignment, replace-in-place, open/download — plus a width slider **only** when the image renders as a preview (a safe, fetchable src — an embedded/imported image); an uploaded image whose object-URL src renders as a download chip isn't resizable here. A previewable image also gets a drag handle on its bottom-right corner (pointer only — keyboard/AT users use the Width slider); both the slider and the handle resize the image **live** and a whole drag is one undo step. Alignment + width persist in the doc and serialize to HTML; Markdown drops them. A newly uploaded/pasted image is laid out at its **perceived** size — natural pixels ÷ device pixel ratio, capped to the editor width — so a retina screenshot isn't inserted at 2× the size you saw; return natural `width`/`height` from `onUpload` (or omit them and the editor measures the file). Persisted/imported image blocks (whose transient upload `status` is dropped on save) stay fully editable — the resize handle and the "Configure" popover treat "ready **or** status-absent" as settled, so editing an existing image comment works exactly like the brand-new composer.

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

**Import:** `fromHtml(html)` and `fromMarkdown(md)` parse a string into a `RichDoc` (e.g. to seed `value` from stored/legacy content). Pasting rich HTML into the editor imports it as formatted content (parsed + sanitized). Markdown import is via `fromMarkdown` only — pasted plain text (incl. Markdown source) inserts literally, except that bare URLs in pasted plain text autolink (see Autolink above). Both `from*` functions require a DOM environment (`DOMParser`); Markdown has no underline syntax and images/tables aren't modeled.

**Export:** `toHtml(doc)` and `toMarkdown(doc)` serialize a `RichDoc` back to a string (the inverse of `fromHtml`/`fromMarkdown`) — e.g. for storage, email bodies, or display outside the editor. `toHtml` is lossless (`fromHtml(toHtml(doc))` round-trips); `toMarkdown` drops underline (no Markdown syntax — use `toHtml` for full fidelity). Both escape output and run hrefs through `safeHref`.

**Mentions:** pass `mentions={{ onQuery }}` (optional `trigger`, default `@`) to
enable `@`-autocomplete. `onQuery(query)` returns `MentionItem[]` (`{ id, label,
description?, avatarUrl? }`), sync or async. Picking a candidate inserts a chip
carrying the `id`; chips survive `toHtml`/`fromHtml` round-trips but degrade to
plain `@label` text in `toMarkdown`. Chips are inert references, not links.

**Undo/redo:** built in — ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo, plus the toolbar Undo/Redo buttons. Typing coalesces into one step (short bursts), and replacing `value` from outside the editor clears the history.

**Input rules:** typing a Markdown marker + space at the start of a paragraph auto-converts the block — `# `/`## `/`### ` → headings, `- `/`* `/`+ ` → bullet list, `1. ` → ordered list, `> ` → blockquote, a triple-backtick fence → code block. One Undo reverts the conversion.

When NOT to use: read-only display → `<RichText>`. It's controlled — render `onChange`'s doc back into `value`, never mutate in place.
