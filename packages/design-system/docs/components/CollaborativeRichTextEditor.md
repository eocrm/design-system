# `CollaborativeRichTextEditor` — real-time co-editing of RichTextEditor over a Yjs doc

`RichTextEditor` bound to a shared `Y.Doc`: several people edit one document at once, with live carets, per-user undo, shared uploads and a connection-status indicator. It takes every `RichTextEditor` prop except `value` / `onChange`. The component owns no network code: your app moves Yjs updates and presence between clients.

Ships from the `/collab` subpath, so apps that never co-edit never bundle `yjs` (the main entry never imports it). `yjs` is an optional peer dependency: install it yourself.

```bash
npm i yjs
```

```tsx
import * as Y from 'yjs';
import { CollaborativeRichTextEditor, fromRichDoc } from '@eocrm/design-system/collab';

const doc = fromRichDoc(initialSnapshot, new Y.Doc()); // seed once (see Persistence)

<CollaborativeRichTextEditor
  doc={doc}
  user={{ name: 'Ana', color: '#d9480f' }}
  presence={othersPresence}
  onPresenceChange={broadcastPresence}
  status="synced"
  toolbar
/>;
```

The component's CSS is imported by its own JS chunk. It is not part of `styles.css` (the one-link bundle covers the main entry only): in a setup that cannot import CSS from JS, import `@eocrm/design-system/collab` through a bundler anyway, as the component needs one.

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `doc` | `Doc` | yes | The shared document. The app owns it and its transport (`doc.on('update')` → send; `Y.applyUpdate` on receive). Seed an empty one with `fromRichDoc`. Swapping it remounts nothing but starts a fresh undo history. |
| `user` | `CollabUser` | yes | The local user (name and colour) as other editors show them. |
| `presence` | `readonly CollabPresence[]` | no | Other users' presence, as relayed by the app: drawn as carets and selection tints, and listed in the status area's accessible text. The entry for `doc.clientID` and entries whose selection no longer resolves are skipped. Removing users who left is the app's job. Once passed, keep an entry for **every connected client**, including ones that never focused the editor (`selection: null`): an `uploading` attachment whose uploader has no entry shows as "Upload interrupted" with Remove. Omit the prop and no upload ever reads as interrupted. |
| `onPresenceChange` | `((presence: CollabPresence) => void)` | no | Fires with this user's presence (`clientId: doc.clientID`) when the local selection moves (throttled to one call per ~100ms) and with `selection: null` when the editor loses focus. Relay it to the other clients. |
| `status` | `'synced' \| 'connecting' \| 'offline'` | no | Connection state of the app's transport, shown as a small text + icon indicator in the toolbar row (`toolbar={true}`) or below the editor, and announced politely on change. Default: `'synced'`. |
| `invalid` | `boolean` | no | `aria-invalid` on the textbox. Field / SettingRow inject it. Default: `false`. |
| `required` | `boolean` | no | `aria-required` on the textbox. Field / SettingRow inject it. Default: `false`. |
| `readOnly` | `boolean` | no | Non-editable: renders the content read-only (prefer `<RichText>` for pure display). |
| `placeholder` | `string` | no | Shown when the document is empty. |
| `autoFocus` | `boolean` | no | Focus the editor on mount. |
| `toolbar` | `false \| true \| 'auto'` | no | Render the built-in formatting toolbar above the editor — Undo/Redo buttons, mark toggle buttons (bold/italic/underline/strike), a block-type dropdown (paragraph/headings/quote/code), and bullet/numbered list toggles. The toolbar dispatches through the same commit path the keyboard uses and reflects the active marks + current block of the live selection. Default `false` (keyboard-only). When `readOnly`, the toolbar renders disabled. `'auto'` shows the toolbar only when the editor is **focused or non-empty**, and keeps it shown while the editor's own overlays (the link editor / mention menu) are open — so opening the link editor on a focused-but-empty composer doesn't collapse the bar. The editable is NOT remounted as the bar appears or hides (the bar toggles in a stable shell), so there's no focus/selection loss. Use it for a compact, focus-gated composer (e.g. a comment box) instead of hand-rolling the show-on-focus logic and working around overlay focus theft. |
| `mentions` | `MentionsConfig` | no | Enable `@`-mention autocomplete. Supply `onQuery` to resolve candidates for the text typed after the trigger (default `@`); the editor renders a floating combobox and inserts a styled mention chip carrying the chosen item's `id`. Omit to disable mentions. See {@link MentionsConfig}. |
| `autolink` | `boolean` | no | Turn typed and pasted URLs into links automatically. While typing, a URL is linked when you type a space after it; on paste, plain-text URLs are linked (a single bare URL pasted over a selection links the selection). Default `true`. Set `false` to disable both the type rule and paste autolinking (the ⌘/Ctrl+K link tool still works). The href is sanitized — only safe schemes (http/https/`www.`) become links. |
| `renderLink` | `RenderLink` | no | Substitute how a link renders. Called per link with `{ href, text }` and the default `<a>`; return your own node (e.g. a task/member chip) or the `defaultNode` to keep the standard anchor. A custom node renders as a non-editable **atomic chip** — the caret steps over it and a single Backspace/ Delete removes the whole link. |
| `renderMention` | `RenderMention` | no | Substitute how an `@`-mention renders. Called per mention with `{ id, label }` and the default mention span; return your own node (e.g. an interactive member chip / popover trigger) or the `defaultNode` to keep the standard non-interactive span. A custom node renders as a non-editable **atomic chip** — the caret steps over it as a single unit. Composes with `renderLink` (both usable together). |
| `imageMaxHeight` | `number` | no | Maximum DISPLAYED height of image attachments, in px. Default: the `--size-rich-text-image-max-height` token (480px). A taller image shrinks (width follows, aspect preserved); the resize handle and width slider stop where the image hits the cap. Render-time only — stored `width`/`height` are unchanged. Pass the same value to the read-only `<RichText>` so both agree. |
| `blockControls` | `boolean` | no | Show Notion-style per-block controls: a left gutter that appears on the hovered/focused block with an insert button (`＋`, adds an empty paragraph below) and a drag handle (`⠿`) that opens a block menu (Turn into ▸, Duplicate, Move up/down, Delete). Reordering is subtree-aware for nested lists. Keyboard: Shift+F10 / the ContextMenu key opens the focused block's menu; ⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓ move the block; ⌘/Ctrl+D duplicates. Default `false`. Ignored when `readOnly`. Independent of `toolbar`. |
| `upload` | `UploadConfig` | no | Enable file upload: a toolbar button (when `toolbar`) and clipboard-file paste. `onUpload(file)` resolves with where the file landed; images render inline as a preview, other files as a download chip. Reject `onUpload` to show a retry/remove error; reject with `new UploadError(message)` to also show that (user-facing, localized) reason on the block — any other rejection shows only "Upload failed". `onUploadingChange` fires while any upload is in flight — wire it to your submit button's disabled state. Validation (size/type) belongs in `onUpload` (`accept` is only a native-picker hint and is bypassed by paste). Omit to disable. Ignored when `readOnly`. When `blockControls` is also on, a ready image attachment can be configured (alt text, alignment, replace, open/download) via the block menu's "Configure" item. The width slider appears only for an image that renders as a preview (a safe, fetchable src — an embed); an uploaded image whose object-URL src renders as a download chip isn't resizable here. Alignment + width round-trip through HTML but not Markdown. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

`CollabUser` is `{ name: string; color: string }`. `CollabPresence` is a `CollabUser` plus `clientId` (the user's `doc.clientID`) and `selection: CollabSelection | null` (`null` when the editor is not focused). `CollabStatus` is `'synced' | 'connecting' | 'offline'`. Also exported: `toRichDoc(doc)` and `fromRichDoc(rich, doc?)`.

## Transport wiring

Relay through whatever your API already offers (for eocrm: POST to the API, receive over SSE / Mercure). Tag updates applied from the network so they are not echoed back:

```tsx
const REMOTE = Symbol('remote');

// local edit -> server
doc.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin !== REMOTE) send(update);
});

// server -> local
onIncoming((update: Uint8Array) => Y.applyUpdate(doc, update, REMOTE));
```

Presence rides the same channel: `onPresenceChange` fires with this user's presence (throttled; `selection: null` on blur) - broadcast it. Keep what arrives in state and pass it as `presence`:

```tsx
const [others, setOthers] = useState<CollabPresence[]>([]);
onIncomingPresence((p) => setOthers((all) => [...all.filter((x) => x.clientId !== p.clientId), p]));
```

Give a client that connects the other side's state (`Y.encodeStateAsUpdate(doc)` from a peer or the stored log); Yjs updates are idempotent, so duplicates and reordering are safe.

## Persistence

- Store the **Y update log** (or a periodically merged `Y.encodeStateAsUpdate(doc)`) as the source of truth. Do not rebuild the doc from a `RichDoc` on every load.
- Store `toRichDoc(doc)` snapshots next to it for search, version history and read-only display with `<RichText>`. They are derived data.
- Migrate an existing page with `fromRichDoc(page, new Y.Doc())`. Seeding is deterministic and content-hashed: clients that seed the **same** snapshot concurrently merge into one copy. Seeding **different** snapshots yields duplicate content (never corruption), so seed from one canonical snapshot. Seeding is a no-op on a doc that already has blocks, and re-seeding after every seeded block was deleted does nothing (the deletions stay).

## Presence and status

- `presence` must contain an entry for **every connected client**, including ones that never focused the editor (`selection: null`). Interrupted-upload detection depends on it: an upload whose uploader has no entry reads as interrupted. Removing entries of users who left is the app's job; the editor never expires them.
- A remote caret's name flag shows for 2 seconds after that caret moves. There is no hover reveal: the overlay ignores the pointer.
- `status` is supplied by the app (the editor cannot see your socket). It shows as a text + icon indicator and is announced politely on change. While `'offline'` or `'connecting'` edits are kept and sync on reconnect, provided your transport buffers and flushes them.

## Behaviour to know

- **Undo is per user.** Undo / Redo revert only your own edits. Upload completion is not an undo step.
- **Uploads are shared.** Every client sees the placeholder, progress and result. Retry is offered to the uploader only. When the uploader leaves `presence`, others see "Upload interrupted" with Remove.
- **Known limit:** reloading the page during your own upload leaves a spinner (the in-flight upload cannot be resumed). Remove the block.

## When NOT to use

- A single-editor page: use `RichTextEditor` (no `yjs`, no transport).
- No realtime transport: the component only renders and edits the doc; it cannot sync by itself.
- Offline-first editing with long disconnects and reconciliation UI: `status` is informational and merges are silent.

## Anti-patterns

- Seeding per client from different snapshots (each client's own cached copy): content duplicates. Seed from one canonical snapshot.
- Passing `presence` without deduping at the transport level: a stale or duplicated entry for the same `clientId` keeps a ghost caret. Keep one entry per `clientId` and drop it when the client disconnects.
- Applying incoming updates without an origin tag and echoing every `update` event: an infinite relay loop.
- Using raw colours elsewhere: the `user.color` presence colours are the only raw colours the library accepts. Style everything else with tokens.
