# RichTextEditor file upload + attachment blocks — design

**Date:** 2026-06-25
**Status:** Approved (brainstorm) → ready for implementation plan
**Component:** `@eocrm/design-system` › `RichTextEditor`
**Slice:** 2 of 3

---

## Context — the larger effort

This is **Slice 2** of the three-slice effort that began as "add file upload to
`RichTextEditor`". Slice 1 (Notion-style block controls) shipped in PR #208. This
slice adds the actual upload: a consumer-provided handler, a toolbar button +
clipboard-file paste, and **attachment blocks** (inline image previews / file
chips). Slice 3 (attachment config — alt text / alignment / replace) is out of
scope here.

Decisions carried in from the Slice 1 brainstorm + this one:

- Attachments are **block-level void nodes** (one per block), so Slice 1's block
  controls (drag-reorder, duplicate, delete, move) apply to them automatically.
- Image MIME types render as an inline **`<Image>` preview**; everything else as a
  **file chip**. Decided by the returned `mime` (URL-extension fallback).
- Upload feedback is a **minimal inline spinner** (no progress bar, no full
  placeholder box) shown in place of the eventual block.
- The editor **signals upload-in-flight** so the consumer can disable submit.

## Goal

Let a user add files to `RichTextEditor` via a toolbar button and clipboard paste;
the consumer supplies the upload handler; uploaded images render inline and other
files render as chips — as first-class blocks the Slice 1 controls already manage.

---

## Public API

```ts
export interface UploadResult {
  /** Where the uploaded file now lives. Required. */
  url: string;
  /** Display name; defaults to the File's name. */
  name?: string;
  /** MIME type; defaults to the File's type. Decides image-preview vs file-chip. */
  mime?: string;
  /** Natural pixel dimensions — help lay out image previews. */
  width?: number;
  height?: number;
  /** Initial alt text (editable in Slice 3). */
  alt?: string;
}

export interface UploadConfig {
  /** Upload one file; resolve with where it landed, reject to show an error. */
  onUpload: (file: File) => Promise<UploadResult>;
  /** Optional native file-picker filter, e.g. "image/*,.pdf". Convenience only —
   *  it does NOT enforce types (paste bypasses it); enforce in `onUpload`. */
  accept?: string;
  /** Fired with `true` while ≥1 upload is in flight, `false` when all settle.
   *  Wire to your submit button's disabled state. */
  onUploadingChange?: (uploading: boolean) => void;
}

export interface RichTextEditorProps {
  // …existing…
  /** Enable file upload (toolbar button + clipboard-file paste). Omit to disable. */
  upload?: UploadConfig;
}
```

- The editor calls `onUpload` **once per file**; multi-file paste/pick loops.
- **No progress callback** (the loader is a spinner). Forward-compatible: a future
  `onUpload(file, onProgress?)` second arg can be added without breaking consumers.
- **Validation/limits** (size, type) live in `onUpload` — reject the promise; the
  editor shows a generic i18n failure + Retry/Remove. The consumer may surface its
  own detailed message (e.g. a toast) from its `catch`.
- All upload UI is gated on `upload` being provided and is suppressed when `readOnly`.

---

## Model

New block type `'attachment'` added to `BlockType`. The block is **void** (no text
runs):

```ts
interface Block {
  // …existing id/type/level?/depth?/inlines…
  /** Attachment block fields (only when type === 'attachment'). */
  src?: string; // the uploaded URL (absent while uploading)
  name?: string; // filename / chip label
  mime?: string; // decides image vs file rendering
  width?: number;
  height?: number;
  alt?: string;
  status?: 'uploading' | 'ready' | 'error';
}
```

- `inlines: []` (empty — void). `blockLength` = 0. Addressed by the single Point
  `{ blockId, offset: 0 }`.
- `status` drives rendering: `uploading` → spinner+name; `error` → name+Retry/Remove;
  `ready` (or absent on imported docs) → image preview or file chip.
- Keeping the fields on the existing `Block` interface (optional) avoids a
  discriminated-union refactor across the engine. Production engine code does not
  assume non-empty `inlines` (verified); the attachment block has its own
  `renderDoc` case so it never hits the generic empty-block `<br>` path.

`createBlock` is NOT extended for attachments — they're created by the editor via a
dedicated transform (below), never hand-authored by consumers.

---

## Rendering (`renderDoc`)

New `case 'attachment'`:

```
<figure data-block-id={id} contentEditable={false}>
  status==='uploading' → <CircularProgress/Spinner> + name
  status==='error'     → name + Retry + Remove   (controls rendered by the editor layer, see note)
  ready, image/*       → <Image src alt={alt ?? name} width height>
  ready, otherwise     → file chip: icon + name + download link (href=src, download)
</figure>
```

- `contentEditable={false}` makes it a true void.
- Reuses the shipped `<Image>` (with its broken-image state) for previews.
- Retry/Remove for the error state are interactive controls. Because `renderDoc` is
  pure model→React and has no callbacks, the **error-state actions are rendered by
  an editor-layer overlay** (like the gutter/link-bubble) keyed to error blocks, OR
  `renderDoc` emits buttons with stable `data-attachment-action` hooks the editor
  delegates via a click handler on the root. Plan picks one; preference: a small
  editor-level click delegation on `[data-attachment-action]` to keep `renderDoc`
  pure. (Read-only `<RichText>` renders attachments without any action controls.)

---

## Void-caret selection (`selection.ts` — the riskiest area)

- `{ voidId, 0 }` → DOM: collapse the caret immediately before the figure
  (`{ node: root, offset: figureIndex }`) so the browser shows an edge caret; or
  select the figure node. `pointToDom` gains a void-block branch (today it walks
  text nodes and falls back to `{ blockEl, 0 }`).
- Reading back: `blockElementFor`/`pointFromDom` resolve a selection anchored **on**
  the figure, or at the **root boundary adjacent** to it, to `{ voidId, 0 }`.
  Today a root-level anchor returns `null` (which would make `readSelection` bail
  and break input near a void) — this is the key fix.
- Arrow navigation rides the browser's native skip-over-`contentEditable=false`;
  the resulting DOM selection is mapped back via the above.
- **Trailing-paragraph invariant:** the document never ends with a void block that
  has no editable home. Inserting an attachment ensures a following paragraph; the
  empty-doc rule keeps one paragraph. This gives the caret a place to live and lets
  the user type after an image.

This area is browser-dependent; it carries the heaviest test budget (unit where
jsdom allows, Playwright/manual for real caret behavior).

---

## Transforms (engine, pure + void-aware)

New file `RichText/engine/attachment.ts` (or fold into `transforms.ts`):

- **`insertAttachmentBlock(doc, point, attrs): { doc, selection }`** — split the
  block at `point`; insert the attachment block between the halves; ensure a
  trailing paragraph if the attachment would be last; caret lands at offset 0 of the
  block **after** the attachment. `attrs` carries `{ name, mime, status, src?, … }`.
- **`updateAttachmentBlock(doc, id, patch): RichDoc`** — patch an attachment block's
  fields by id (used by the async resolve/error settle). No-op if absent.
- **Void-aware delete:** Backspace at offset 0 of a block whose previous block is
  void → remove the void (reuse Slice 1 `removeBlockUnit`). Delete at end when the
  next is void → same. A selected void + Backspace/Delete → remove it.
- **`mergeBlockBackward` / `splitBlock`** become void-aware: never merge text into or
  out of a void; splitting a void is a no-op (or inserts an empty paragraph after).

Each transform returns the `{ doc, selection }` contract and same-ref no-ops.

---

## Upload lifecycle (editor layer)

1. Files arrive (toolbar picker or paste). For N files, **one commit** inserts N
   `status:'uploading'` blocks in file order at the caret (one undo step).
2. Fire all `onUpload(file)` calls in parallel. Track in-flight count; call
   `onUploadingChange(true)` on the first, `(false)` when the count returns to 0.
3. On resolve → `updateAttachmentBlock(id, { status:'ready', ...result })`. On
   reject → `{ status:'error' }`. **These settles update in place and do not add
   undo steps** (applied without recording a new history entry, or by replacing the
   pending entry — plan decides; principle: never undo _through_ an async settle).
4. If the block id no longer exists at settle time (user deleted it), drop silently.
5. Keep each uploading/error file in an **id-keyed `File` ref map** so Retry can
   re-run `onUpload`; Remove deletes the block and clears the ref.

---

## Serialization

The stored **RichDoc JSON round-trips losslessly** (all fields persist). HTML/MD are
export formats:

- `toHtml`: ready image → `<figure><img src alt></figure>`; ready file →
  `<a href=src>name</a>`. Non-`ready` blocks emit nothing.
- `toMarkdown`: image → `![alt](src)`; file → `[name](src)`. Non-`ready` → nothing.
- `fromHtml` `<img>` (currently dropped) → a ready **image** attachment block
  (`src`, `alt`, `mime:'image/*'` inferred). `fromMarkdown` `![alt](src)` → same.
- Bare file links re-import as plain links (the chip is render-time; lossy only for
  HTML/MD, never for stored JSON).

---

## Wiring

- **Toolbar button** (only when `toolbar` AND `upload`): an image/attach button in
  `RichTextToolbar` that opens a hidden `<input type="file" multiple accept>`.
- **Paste**: extend the existing `onPaste` — if `clipboardData.files` is non-empty,
  upload them and `preventDefault`; else fall through to today's HTML/URL handling.
- **Block controls (Slice 1):** attachment blocks get the gutter/drag/duplicate/
  delete for free. **"Turn into" is hidden for attachment blocks** (converting an
  image to a heading is nonsense) — a small `RichTextBlockMenu` gate.
- No drag-and-drop and no block-menu "Upload" item in v1 (backward-compatible later).
- All gated on `upload`; nothing renders/binds without it; everything suppressed in
  `readOnly`.

---

## i18n (new keys; en + ru)

- `richTextEditor.upload` — toolbar button aria-label ("Add file" / "Upload")
- `richTextEditor.uploadFailed` — error-state label
- `richTextEditor.uploadRetry` — Retry action
- `richTextEditor.uploadRemove` — Remove action
- `richTextEditor.uploadingFile` — spinner label (e.g. "Uploading…")
- `richTextEditor.attachmentDownload` — file-chip download aria-label

---

## Testing

Engine (pure): `insertAttachmentBlock` (split + trailing paragraph + caret),
`updateAttachmentBlock`, void-aware delete/backspace/merge/split, serialization
round-trip for `<img>`/`![]()`, `blockLength`=0.

Selection: `pointToDom`/`pointFromDom` void-block mapping (the jsdom-testable parts:
selection on the figure, root-boundary resolution).

Component (`RichTextEditor.test.tsx`): paste a file → `uploading` block → resolves to
`<Image>`; `onUpload` rejection → error + Retry re-invokes `onUpload`; multi-file
keeps file order; `onUploadingChange(true/false)` fires around the batch; toolbar
button opens the picker (gated on `upload`); `readOnly`/no-`upload` render nothing;
serializers skip non-`ready` blocks; "Turn into" absent on an attachment block.

Void-caret real-browser behavior (click-beside-image, arrow over image, Backspace
removes it): **Playwright/manual** in the playground — jsdom has no real caret.

---

## Definition of done (DS checklist)

- [ ] Engine transforms + tests (Rule 1)
- [ ] `selection.ts` void-block handling + tests
- [ ] `renderDoc` attachment case + tests
- [ ] Editor wiring (upload lifecycle, paste, toolbar button) + component tests
- [ ] Serialization (to/from HTML + MD) + round-trip tests
- [ ] i18n keys in en + ru (Rule 9)
- [ ] JSDoc on `upload`/`UploadConfig`/`UploadResult` + `@remarks` anti-patterns (Rule 7)
- [ ] Exports: `UploadConfig`, `UploadResult` from the package index (Rule 5)
- [ ] Tokens-only SCSS for the figure/spinner/chip/error states (Rules 3, 4)
- [ ] Playground demo: an editor with a mock `onUpload` (resolves to a data/blob URL)
- [ ] AGENTS.md entry for `upload`
- [ ] Manifest unchanged (no new component) — confirm during plan
- [ ] Pre-push Rule 8 review loop; gates green; `npm pack --dry-run` clean

## Future (Slice 3)

Attachment config via the block menu: alt text, alignment, width, replace,
open/download. Plus possible drag-and-drop and a block-menu "Upload" item.
