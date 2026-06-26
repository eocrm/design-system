# RichTextEditor attachment config — design

**Date:** 2026-06-26
**Status:** Approved (brainstorm) → ready for implementation plan
**Component:** `@eocrm/design-system` › `RichTextEditor`
**Slice:** 3 of 3 (final)

---

## Context — the larger effort

Final slice of the three-slice effort that began as "add file upload to
`RichTextEditor`". Slice 1 (block controls, PR #208) and Slice 2 (file upload +
void attachment blocks, PR #211) shipped. This slice adds **per-attachment
configuration** — edit alt text, alignment, and width; replace the file in place;
open/download — through a floating config popover.

Carried-in facts from Slices 1–2:

- An attachment is a **void block** (`type: 'attachment'`, `inlines: []`,
  `contentEditable=false`) with fields `src/name/mime/width/height/alt/status`.
- It renders via `RichTextAttachment.tsx` (image preview / file chip / spinner /
  error), wrapped by `renderDoc` in a `<figure data-block-id contentEditable=false
data-attachment>`.
- Uploads flow through the `useUpload` hook; the editor exposes `upload?:
UploadConfig` (`onUpload`/`accept`/`onUploadingChange`).
- The block controls (`RichTextBlockControls` gutter + `RichTextBlockMenu`) already
  manage attachments (reorder/duplicate/delete; "Turn into" is hidden for them).
- Every text transform is void-defended (an edit can never corrupt an attachment).

## Goal

Let a user configure a ready attachment in place: set image alt text (a11y),
alignment, and display width; replace the file; and open/download it — via a small
floating popover, without leaving the controlled `value`/`onChange` round-trip.

## Scope

In scope:

- One **new persisted field**: `align?: 'left' | 'center' | 'right'` (absent = left).
- Reuse existing `alt` (now editable) and `width`/`height` (now a resizable display
  size, not just an upload hint).
- A floating **config popover** (`RichTextAttachmentConfig`) holding: alt text,
  alignment toggle, width slider (+ reset), Replace, Open, Download.
- A **⚙ trigger** on the active attachment (in the block-controls gutter) **and** a
  **"Configure" item** in the attachment's ⠿ block menu.
- Render + HTML serialization of `align` and `width`; round-trip via `fromHtml`.
- Reduced popover for **non-image** attachments (file chips): Replace / Open /
  Download only.

Out of scope / non-goals:

- Config is offered only for **`ready`** attachments (never uploading/error).
- No Markdown representation of align/width (lossy — documented, like underline).
- No drag-to-resize handles (slider only) and no crop/rotate (YAGNI).
- No new top-level prop — config is built-in whenever `upload` is set; suppressed
  when `readOnly`.

---

## Model

`packages/design-system/src/components/RichText/engine/model.ts` — add to the
attachment fields on `Block`:

```ts
  /** Attachment image alignment within the editor width. Absent = left. */
  align?: 'left' | 'center' | 'right';
```

`width`/`height` keep their types (`number`) but their meaning broadens to the
**display** size (px). The image's `max-width: 100%` (from `<Image>`) prevents
overflow when a stored width exceeds the container.

`AttachmentAttrs` (in `attachment.ts`) gains `align?` so `updateAttachmentBlock`
can patch it. `updateAttachmentBlock` already strips `undefined` keys, so clearing
width (reset) is done by patching `width`/`height` to `undefined` → they're dropped
(canonical "natural size").

> Note: clearing a field needs a patch that actually removes it. Since
> `updateAttachmentBlock` drops `undefined` keys (won't overwrite), add a tiny
> `resetAttachmentSize(doc, id)` helper (or a `clear: ('width'|'height')[]` option)
> that deletes `width`/`height` from the block. Plan picks the cleanest; preference:
> a small `clearAttachmentFields(doc, id, keys)` engine helper, symmetric with
> `updateAttachmentBlock`.

---

## Surface & triggers

- **⚙ overlay button** — added to the existing `RichTextBlockControls` gutter,
  shown only when the active block is a `ready` attachment. `tabindex=-1`, i18n
  aria-label (`richTextEditor.attachmentConfigure`). Clicking opens the popover.
- **"Configure" block-menu item** — `RichTextBlockMenu` already hides "Turn into"
  for attachments; add a "Configure" item (gated to `blockType === 'attachment'`)
  at the top, firing the same open action.
- The editor tracks `configBlockId: string | null`. When set (and the block is a
  ready attachment), it renders `RichTextAttachmentConfig` anchored to that
  figure's rect via a Floating-UI virtual element (same portal + `autoUpdate` +
  `flip`/`shift`/`offset` pattern as `RichTextLinkEditor`). Esc / click-outside
  closes; closing returns focus to the editable.

---

## The config popover (`RichTextAttachmentConfig.tsx`)

Internal, presentational; the editor owns state and passes the block's current
values + callbacks. Form contents for an **image**:

- **Alt text** — `<Input>` seeded `alt ?? name`. Commits on blur / Enter via
  `onAltChange(alt)`. Empty allowed (decorative).
- **Alignment** — a 3-button segmented control (Left/Center/Right) using `Button`s
  (pressed state on the active one). Clicking fires `onAlignChange(align)`
  immediately.
- **Width** — DS `<Slider>` over 20%–100% of the editor content width (mapped to px
  vs. the natural width, capped at natural). Live local preview while dragging;
  **one** `onWidthChange(px)` on release (`onValueCommit`/pointer-up) → a single
  undo step. A **Reset** link fires `onWidthReset()` (natural size).
- **Replace / Open / Download** — buttons: Replace fires `onReplace()` (opens the
  picker); Open fires `onOpen()` (new tab); Download is an `<a download href=src>`.

For a **non-image** attachment: render only **Replace / Open / Download**.

All labels via i18n. The popover is remounted per-open (`key`) so fields re-seed
from the block.

---

## Editor wiring (`RichTextEditor.tsx`)

- State `configBlockId`; setters from the ⚙ button and the menu item.
- Field handlers, all through the existing controlled path:
  - `onAltChange(id, alt)` → `commit(updateAttachmentBlock(value, id, { alt }), 'other')`.
  - `onAlignChange(id, align)` → `commit(updateAttachmentBlock(value, id, { align }), 'other')`.
  - `onWidthChange(id, width)` → compute proportional `height` from natural ratio,
    `commit(updateAttachmentBlock(value, id, { width, height }), 'other')`.
  - `onWidthReset(id)` → `commit(clearAttachmentFields(value, id, ['width','height']), 'other')`.
  - `onReplace(id)` → open the picker; route the chosen file through `useUpload`'s
    replace path (see below).
  - `onOpen(id)` → `window.open(safeHref(src), '_blank', 'noopener')`.
- Closing config returns focus to the editable.

**Replace path (useUpload):** add `replace(id, file)` to `useUpload` — set the
block to `status:'uploading'` (keep `align`/`alt`), run `onUpload(file)`, then on
resolve patch `src/name/mime/width/height` (clearing the old width so the new
file's natural size applies) via the undo-isolated `applySettle`; on reject set
`status:'error'` (the existing Retry/Remove still work). Reuses the in-flight
File ref keyed by block id.

---

## Render & SCSS

- `renderDoc` attachment `case`: add `data-align={block.align}` to the `<figure>`
  when set.
- `RichTextEditor.module.scss`: align the image **within** the figure with
  `text-align` (an allowed property — not the forbidden margin/position/flex/width):
  `figure[data-attachment][data-align='center'] { text-align: center }` and `right`.
  Default (no `data-align`) stays left. The image already renders with
  `width`/`height`.

> `text-align` centers the image because the image is an inline/inline-block child
> of the figure (confirm the `<Image>` root is inline-block, or wrap so it is).

---

## Serialization

- **`toHtml`** (attachment case): when `align` is set, emit
  `<figure style="text-align:{align}">`; when `width` is set, emit
  `<img … width="{width}">` (and `height` if present). Unsafe `src` still drops the
  block (unchanged).
- **`fromHtml`**: when importing `<figure><img>` / block `<img>`, read the figure's
  `text-align` inline style → `align` (only `left`/`center`/`right`), and the
  `<img width>` attribute → `width` (+ `height`). The parser already reads inline
  styles for marks, so style reading is established.
- **`toMarkdown`/`fromMarkdown`**: align/width are **not represented** (dropped on
  export, absent on import) — documented in JSDoc + AGENTS, consistent with
  underline/mention lossiness. Stored RichDoc JSON round-trips losslessly.

---

## i18n (new keys; en + ru)

- `richTextEditor.attachmentConfigure` — ⚙ button + menu item label
- `richTextEditor.attachmentAlt` — alt-text field label
- `richTextEditor.attachmentAlign` — alignment group label
- `richTextEditor.attachmentAlignLeft` / `…Center` / `…Right` — button aria-labels
- `richTextEditor.attachmentWidth` — width slider label
- `richTextEditor.attachmentWidthReset` — reset link
- `richTextEditor.attachmentReplace` — replace button
- `richTextEditor.attachmentOpen` — open button
- (`attachmentDownload` already exists from Slice 2)

---

## Testing

Engine: `align` survives `updateAttachmentBlock`; `clearAttachmentFields` removes
`width`/`height`; `setBlockType`/void-defense unaffected; serialization to/from
HTML for `align` + `width` (round-trip), Markdown drops them.

Component (`RichTextAttachmentConfig.test.tsx`): renders fields seeded from the
block; alt commits on blur; align buttons fire `onAlignChange`; width slider fires
one `onWidthChange` on release; Reset fires `onWidthReset`; a non-image block shows
only Replace/Open/Download.

Editor integration (`RichTextEditor.test.tsx`): ⚙ appears for a ready attachment
and opens the popover; the "Configure" menu item opens it; alt/align/width changes
land in `value` and are undoable (single steps); Replace swaps the file in place
keeping `align`/`alt` + position; `readOnly` shows no ⚙/config; config absent for
uploading/error blocks.

Manual/Playwright (jsdom gaps): slider drag, popover positioning/flip, focus
return, Open-in-new-tab.

---

## Definition of done (DS checklist)

- [ ] Model `align` field + `AttachmentAttrs.align` + `clearAttachmentFields` + tests
- [ ] `useUpload.replace(id, file)` + tests
- [ ] `RichTextAttachmentConfig` popover + tests
- [ ] ⚙ gutter trigger + "Configure" menu item + tests
- [ ] Editor wiring (config state, field handlers, focus return) + tests
- [ ] renderDoc `data-align` + SCSS `text-align` (tokens/allowed-props only)
- [ ] Serialization align+width to/from HTML; Markdown drops + tests
- [ ] i18n en + ru
- [ ] JSDoc/`@remarks` note (config built-in with `upload`; align/width Markdown-lossy)
- [ ] AGENTS.md updated (attachment config)
- [ ] Playground demo shows configuring an attachment
- [ ] Manifest unchanged (no new public component) — confirm
- [ ] Rule 8 review loop; gates green; `npm pack --dry-run` clean

## Future

None planned — this completes the upload effort. (Possible later: drag-resize
handles, crop, captions.)
