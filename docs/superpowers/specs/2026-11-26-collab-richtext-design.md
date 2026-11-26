# Collaborative RichTextEditor — Yjs binding, presence (DS-92)

## Intent

eocrm's internal wiki (EO-260 phase 2) wants several people editing one page live. Today `RichTextEditor` is
controlled (`value`/`onChange`); replacing `value` from outside resets undo history and is treated as a
rejected edit, so remote edits can't merge and there's no presence. eocrm relays updates through its own API +
Mercure SSE hub (no WebSocket provider). dpws chose full Yjs over block-level locking.

## Goals / non-goals / anti-goals

- Goals: real-time co-editing of the existing `RichDoc` feature set (marks incl. link/mention/colours,
  headings, lists with depth, quotes, code blocks, attachments/upload, blockControls/drag); per-user undo;
  remote carets + selections with names/colours; transport-agnostic; `toRichDoc` / `fromRichDoc` snapshots;
  app-supplied sync status shown in the editor.
- Non-goals: WebSocket server or provider, offline-first persistence, comments/suggestions, `y-protocols`
  awareness, a read-only collaborative viewer (use `<RichText value={toRichDoc(doc)}>`).
- Anti-goals: any change to `RichTextEditor`'s public behaviour when not collaborating; `yjs` reaching the
  main entry or the bundles of apps that don't import `/collab`; silent divergence between the editor's view and
  the Y.Doc (every local edit must land in the Y.Doc; every Y.Doc state must render).

## Approaches

- **Diff-based bridge — chosen.** The editor keeps its immutable `RichDoc` model and commands. A sync layer
  diffs prev→next `RichDoc` on each local change into minimal Y ops, and rebuilds only changed blocks on remote
  updates, remapping the selection through `Y.RelativePosition`s (the y-prosemirror approach).
- Command-level ops — every editor command emits Y ops; precise but touches ~12k lines; a missed command
  silently desyncs.
- Block-level locking without a CRDT — rejected by dpws in favour of full co-editing.

## Packaging (decided)

- New export subpath `@eocrm/design-system/collab` (same mechanism as `./i18n/ru`: `@eocrm/source`, types,
  import, default). Exports `CollaborativeRichTextEditor`, `toRichDoc`, `fromRichDoc`, and types
  (`CollaborativeRichTextEditorProps`, `CollabUser`, `CollabPresence`, `CollabStatus`, `CollabSelection`).
- `yjs` `^13.6` = optional `peerDependency` (+ `peerDependenciesMeta.optional`) and a devDependency. Only
  `/collab` code imports `yjs`; a test asserts the main entry's module graph never does.
- Package `CLAUDE.md` dependency policy gains exception (f): `yjs`, scoped to `/collab` (CRDT algorithm
  dependency; hand-rolling a CRDT fails silently).
- Separate size-budget entry for `/collab` (excluding yjs itself, which is a peer).

## API

```ts
interface CollaborativeRichTextEditorProps extends Omit<RichTextEditorProps, 'value' | 'onChange'> {
  /** The shared document. The app owns it and its transport (doc.on('update') → send; Y.applyUpdate on receive). */
  doc: Y.Doc;
  /** Local identity shown to others. */
  user: CollabUser; // { name: string; color: string }
  /** Remote users' presence, as relayed by the app. Entries for doc.clientID are ignored. */
  presence?: readonly CollabPresence[]; // { clientId: number; name: string; color: string; selection: CollabSelection | null }
  /** Fires when the local selection (or focus) changes — the app broadcasts it. Throttled (~100ms) + on blur → null. */
  onPresenceChange?: (presence: CollabPresence) => void;
  /** Connection state from the app's transport, shown unobtrusively in the editor. Default 'synced'. */
  status?: CollabStatus; // 'synced' | 'connecting' | 'offline'
}
type CollabSelection = { anchor: string; focus: string }; // base64 of Y.encodeRelativePosition
function toRichDoc(doc: Y.Doc): RichDoc;
function fromRichDoc(rich: RichDoc, doc?: Y.Doc): Y.Doc; // fills an empty doc (or a new one) in one transaction
```

`color` values are app-supplied CSS colours for presence chrome only (data, like an avatar colour — documented as
the one place a raw colour is accepted; the editor's own chrome stays on tokens).

## Y schema

- `doc.getArray<Y.Map<unknown>>('blocks')` — one `Y.Map` per block: `id`, `type`, `level?`, `depth?`,
  attachment attrs (`src`, `name`, `mime`, `width`, `height`, `alt`, `align`, `status`, `uploadError`), and
  `text: Y.Text`.
- Inline marks are `Y.Text` formatting attributes: boolean marks as `true`; `link: { href }`;
  `mention: { id, label }` (a mention is an atomic run — its text is the label; edits inside it are refused by
  the editor already); `textColor: color`, `bgColor: color`.
- An empty doc renders as one empty paragraph; `toRichDoc` of an empty Y.Doc returns that, and the editor seeds
  it into the Y.Doc only on the first local edit (never on mount, so two clients opening an empty doc don't both
  insert a paragraph).
- Block ids in collab mode must be globally unique: `${doc.clientID.toString(36)}-${counter}`; the editor's
  `nextId` gets an injectable id source (internal), used only in collab mode.

## Sync layer

- Local change (editor emits next `RichDoc`): diff prev→next.
  - Blocks: by id — deletions, insertions, moves (delete + insert of the same block map is acceptable; preserve
    the existing `Y.Text` when a block keeps its id and only its type/attrs change).
  - Per block text: common-prefix/suffix splice on the plain text, then mark diffs on the changed range and on
    runs whose marks changed (`Y.Text.format`). Attribute changes via `Y.Map.set`.
  - All in one `doc.transact(…, LOCAL_ORIGIN)`.
- Remote change (`blocks.observeDeep`, transactions whose origin isn't LOCAL_ORIGIN): rebuild only the touched
  blocks (structural sharing for the rest), push the new `RichDoc` into the editor through an internal seam that
  does NOT reset history or treat it as a rejected edit, and remap the local selection: before applying, encode
  it as relative positions; after, decode back to `{ blockId, offset }` (fallback: the nearest surviving
  position).
- Correctness invariant (tested with randomised edit sequences across 2–3 Y.Docs syncing in memory):
  `toRichDoc(doc)` equals the editor's `RichDoc` after every local edit, and all replicas converge.

## Editor seam (internal, not exported from the main entry)

`RichTextEditor` gains an internal, non-public way (e.g. a context or an `__internal` prop typed in a
non-exported module) to: accept an externally driven doc + selection without resetting history; delegate
undo/redo (keyboard + toolbar) to a supplied handler; report selection changes; use an injected block-id
source; render presence overlays. Without it, behaviour is byte-identical (all existing tests unchanged).

## Undo

`Y.UndoManager` on the `blocks` array with `trackedOrigins: new Set([LOCAL_ORIGIN])`, `captureTimeout`
≈ the editor's existing coalesce window (600ms). Undo/redo restore the selection stored with the stack item
(relative positions). The editor's own history is bypassed in collab mode.

## Presence UI

- Remote caret: thin bar in the user's colour with a small name flag (flag hides after ~2s idle, shows on
  hover); remote selection: translucent tint of the colour. Rendered as an overlay positioned from DOM ranges,
  recomputed on doc change, resize and scroll; `pointer-events: none`; `aria-hidden`.
- No live announcements of others' movement. The status area (below) includes "N others editing" with names
  in its accessible text.
- Stale presence is the app's job (it removes users from `presence`); entries whose relative positions no
  longer resolve are skipped.

## Status

`status` prop shown as a small inline indicator in the editor's toolbar row (or footer when no toolbar):
synced (quiet), connecting, offline — text + icon, not colour alone; i18n en + ru; announced politely on change
(Rule 10 live region, rendered unconditionally in collab mode).

## Testing

- Node: schema mapping round-trip (`fromRichDoc` → `toRichDoc` equality for every block type and mark combo);
  diff bridge unit cases; randomised convergence across in-memory replicas; relative-position remap.
- jsdom: `CollaborativeRichTextEditor` renders a seeded doc; local typing produces Y updates; a remote update
  shows without resetting undo; undo reverts only local changes; presence overlay renders for remote users;
  status announcement; main-entry-never-imports-yjs test.
- Playground: two editors side by side syncing through an in-memory relay with simulated latency and a
  "go offline" toggle.

## Resolved after the builder check (controller's calls)

- **Block order supersedes the `Y.Array` schema above.** Blocks live in `doc.getMap<Y.Map>('blocks')` keyed by
  block id; each block map has an `order` string (fractional index; tie-break by id). Moves change `order` only,
  so concurrent moves converge (last writer wins), concurrent typing in a moved block survives, and duplicate ids
  are impossible. Inserts pick a key between neighbours; a small pure fractional-index helper (Node-tested,
  incl. many inserts at the same gap and concurrent same-gap inserts from two replicas) lives in `/collab`.
  Deleting a block deletes its map entry.
- **Deterministic seeding.** `fromRichDoc` builds its content in a scratch Y.Doc whose `clientID` is a reserved
  constant (0) with deterministic block ids and order keys derived from the RichDoc, then applies that update
  to the target doc. Two clients seeding the same RichDoc produce identical items, which Yjs merges
  idempotently — no duplicated content, no coordination needed. Seeding a doc that already has blocks is a
  no-op (documented). The docs recommend the app persist the Y update log (or a merged state) as the source of
  truth and store `toRichDoc` snapshots for search, versions and `<RichText>`.
- **Uploads.** Upload state is shared: an attachment block carries `status` and `uploadedBy` (the uploader's
  `clientID`). Other clients show `uploading` blocks whose uploader is absent from `presence` as "Upload
  interrupted" (i18n). Retry is offered only to the uploader (it alone holds the `File`); Remove to everyone.
  `uploadError` stays local to the uploader (other clients show the generic failed state).

## Builder's calls

Exact seam shape; overlay geometry implementation; diff algorithm details beyond the invariant; token names
for presence chrome; how attachments' `uploading` status syncs (a local-only flag vs shared — prefer shared so
others see the spinner, provided `uploadError` text stays local-language-agnostic).
