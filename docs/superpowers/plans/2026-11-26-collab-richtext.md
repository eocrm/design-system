# Collaborative RichTextEditor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@eocrm/design-system/collab` ships a Yjs-bound `CollaborativeRichTextEditor` with per-user undo, presence, status, and `toRichDoc` / `fromRichDoc` (DS-92).

**Architecture:**

- A `/collab` subpath, with `yjs` as an optional peer dependency.
- Pure Node-tested modules in `src/collab/`: fractional order, the Y schema mapping, the diff bridge and selection remap.
- A small internal seam in `RichTextEditor`, so a wrapper can drive the doc and selection without resetting history, delegate undo/redo, inject block ids and render overlays.
- The wrapper component owns the sync, `Y.UndoManager`, presence and status.

**Tech Stack:** React 19 + TS, `yjs@^13.6` (latest; the user's rule is latest versions), Vitest (Node + jsdom), SCSS modules + tokens, i18n en/ru.

**Spec:** `docs/superpowers/specs/2026-11-26-collab-richtext-design.md`. It is binding; its "Resolved after the builder check" section supersedes the earlier `Y.Array` schema.

## Global Constraints

- **The main entry never imports `yjs`.** Only files under `src/collab/` may import it. A test walks the main entry's import graph to enforce this.
- **Without the seam, `RichTextEditor` is byte-identical:** every existing RichTextEditor test passes unmodified.
- **Y schema:**
  - `doc.getMap('blocks')`, keyed by block id. Each block `Y.Map` holds `id`, `order` (a fractional index string; ties broken by id), `type`, `level?`, `depth?`, the attachment attributes, `uploadedBy?` and `text: Y.Text`.
  - Marks are `Y.Text` formatting attributes: boolean marks as `true`; `link: { href }`; `mention: { id, label }`; `textColor` and `bgColor` hold a colour string.
- **Block ids:** collaborative mode uses `${doc.clientID.toString(36)}-${n}`. `fromRichDoc` seeds deterministically: reserved `clientID` 0, deterministic ids and order, and a no-op on a non-empty doc.
- **Transactions:** local edits go in a transaction with a module-level `LOCAL_ORIGIN`. `Y.UndoManager` tracks only that origin, and its `captureTimeout` is 600.
- **Package Hard rules:** tokens only, except app-supplied presence colours (documented); no layout props; JSDoc on every export; i18n en + ru; Rule 10 live region for status; forwardRef + rest props.

## Review Focus

- **Two replicas editing the same block** (typing at the same offset; one typing while the other moves the block; one deleting a block the other is typing in) must converge, with no duplicate ids → Task 3 randomised test.
- **IME composition in progress during a remote update** must not break the composition; defer applying until `compositionend` → Task 4 test (jsdom events).
- **A remote edit before the local caret** shifts the caret correctly; a remote delete of the caret's block moves the caret to the nearest surviving point → Task 3 + Task 4 tests.
- **Undo after a remote edit** reverts only the local change, leaves the remote text intact and restores the local selection → Task 4 test.
- **An `uploading` block whose uploader leaves `presence`** shows "Upload interrupted" to others, Retry appears only for the uploader → Task 5 test.

---

### Task 1: The `/collab` subpath, dependency and fractional order

**Files:**

- `packages/design-system/package.json`:
  - `exports["./collab"]`, mirroring `./i18n/ru`;
  - `peerDependencies.yjs` with `peerDependenciesMeta.yjs.optional`;
  - `devDependencies.yjs` at the latest version.
- The library build config (`vite.lib.config.ts` and `tsconfig.build.json`) and any style/dts scripts, so `dist/collab/index.{js,d.ts}` is built with `yjs` external.
- Create `src/collab/index.ts`, `src/collab/order.ts` and `src/collab/order.test.ts`.
- Create `src/collab/mainEntryNoYjs.test.ts`, which walks static imports from `src/index.ts` and fails if any reaches `yjs` or `src/collab/`.
- `packages/design-system/CLAUDE.md`: dependency policy exception (f), `yjs`, only in `/collab`.
- `size-budgets.json`: add a `collab` entry later, in Task 6.

**Interfaces — Produces:** `orderBetween(a: string | null, b: string | null): string`, which returns a key strictly between `a` and `b` (`null` means an open end), and `compareOrder(a: {order: string; id: string}, b: …): number`.

- [ ] **Step 1: Failing tests:**
  - `orderBetween` stays strictly between its bounds across 1,000 repeated inserts at the same gap, at the head and at the tail;
  - key length grows slowly (assert a cap, e.g. under 40 characters after 1,000 same-gap inserts);
  - `compareOrder` breaks ties by id;
  - the main-entry test passes now and must keep passing.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `order.ts` as a base-62 midpoint string scheme in about 40 lines. Add the subpath wiring and build config. `src/collab/index.ts` exports nothing public yet beyond a placeholder comment; the components come later.
- [ ] **Step 4:** `npm run build -w @eocrm/design-system` emits `dist/collab/` with no `yjs` code inlined (grep the output). `make test` passes.
- [ ] **Step 5:** Commit `feat(collab): /collab subpath, yjs optional peer, fractional order (DS-92)`.

### Task 2: The Y schema, `toRichDoc` and `fromRichDoc`

**Files:** create `src/collab/schema.ts` and `schema.test.ts`, and export `toRichDoc` and `fromRichDoc` from `src/collab/index.ts`.

**Interfaces — Produces:**

- `toRichDoc(doc: Y.Doc): RichDoc`. An empty doc gives one empty paragraph, never written back.
- `fromRichDoc(rich: RichDoc, doc?: Y.Doc): Y.Doc`. It is deterministic and a no-op on a non-empty doc.
- `blockToRich(m: Y.Map): Block` and `writeBlock(m: Y.Map, b: Block)`, internal and reused by Task 3.
- `BLOCKS = 'blocks'`.

- [ ] **Step 1: Failing tests:**
  - round-trip for every block type, every mark (including `link`, `mention` and colours), mixed overlapping marks, attachment attributes and list depths;
  - two fresh docs seeded from the same `RichDoc`, then cross-applied, produce no duplicates and an identical `toRichDoc`;
  - seeding a non-empty doc is a no-op;
  - inline runs are normalised: adjacent runs with equal marks merge, so equality is well defined.
- [ ] **Steps 2–4:** RED → implement → GREEN.
- [ ] **Step 5:** Commit `feat(collab): Y schema and RichDoc bridge (DS-92)`.

### Task 3: The diff bridge and selection remap (pure, Node)

**Files:** create `src/collab/bridge.ts` and `bridge.test.ts`.

**Interfaces — Produces:**

- `applyLocal(doc: Y.Doc, prev: RichDoc, next: RichDoc, origin: unknown): void`. It runs in a single transaction and covers:
  - block insert and delete;
  - order changes for moves, preserving the existing `Y.Text`;
  - attribute changes;
  - per-block text changes: a prefix/suffix splice, then mark re-formatting of the changed and re-marked runs.
- `readChanged(doc: Y.Doc, prev: RichDoc, events: Y.YEvent<any>[]): RichDoc`, which rebuilds only touched blocks and shares the rest structurally.
- `encodeSelection(doc, sel: Range | null): CollabSelection | null`.
- `decodeSelection(doc, sel: CollabSelection | null, fallback: RichDoc): Range | null`, which falls back to the nearest surviving point.

- [ ] **Step 1: Failing tests:**
  - unit diffs: typing, deleting across runs, toggling a mark on a range, splitting and merging blocks, changing a block's type, a list depth change, moving a block, inserting an attachment;
  - after each, `toRichDoc(doc)` deep-equals `next`, after normalisation;
  - a randomised convergence test: 3 in-memory replicas, a seeded PRNG, 300 random editor-level operations each, made through `applyLocal` against each replica's local `RichDoc`, with updates exchanged in random order and delays. All replicas converge, ids are unique, and `toRichDoc` matches each replica's last `readChanged` view;
  - selection remap under remote inserts before, at and after the caret, and when the caret's block is deleted.
- [ ] **Steps 2–4:** RED → implement → GREEN. The seeded PRNG keeps the run fixed.
- [ ] **Step 5:** Commit `feat(collab): diff bridge and selection remap (DS-92)`.

### Task 4: The editor seam and `CollaborativeRichTextEditor` (sync, undo, ids)

**Files:**

- `src/components/RichTextEditor/RichTextEditor.tsx`: an internal seam through a non-exported context module, `src/components/RichTextEditor/collabSeam.ts`. It provides:
  - an external doc+selection setter that doesn't reset history;
  - an undo/redo handler override for keyboard, `beforeinput` and the toolbar;
  - a selection listener;
  - a block-id source;
  - an overlay render slot;
  - a composition-state getter.
- Create `src/collab/CollaborativeRichTextEditor.tsx`, `.module.scss` and `.test.tsx`.

**Interfaces — Consumes:** Tasks 2–3. **Produces:** `CollaborativeRichTextEditor` and its props per the spec's API section, minus presence and status UI, which are Task 5.

- [ ] **Step 1: Failing jsdom tests:**
  - it renders a seeded doc;
  - typing produces a Y update containing the text;
  - a remote update (applied to a second doc and synced in) appears without resetting undo, and the caret stays put;
  - undo after a remote edit reverts only the local edit;
  - redo works;
  - a remote update during IME composition is applied after `compositionend`;
  - new blocks get `clientID`-prefixed ids;
  - all existing RichTextEditor tests still pass unmodified.
- [ ] **Steps 2–4:** RED → implement → GREEN. Run `npm run typecheck` and `make lint`.
- [ ] **Step 5:** Commit `feat(collab): CollaborativeRichTextEditor sync and undo (DS-92)`.

### Task 5: Presence, status and uploads

**Files:**

- `CollaborativeRichTextEditor.tsx`, `.module.scss` and a new `.tokens.scss`.
- Create `src/collab/presence.tsx`, the overlay that computes rects from DOM ranges.
- i18n `collab.*` keys in `messages.ts`, `en.ts` and `ru.ts`.
- Upload handling, via the seam if needed.

- [ ] **Step 1: Failing tests:**
  - remote carets and selections render for `presence` entries, skipping our own `clientID` and unresolvable positions, with `aria-hidden`;
  - `onPresenceChange` fires throttled on selection change, and with `null` on blur;
  - the status indicator shows text and an icon, and a status change is announced politely; the live region always renders in collab mode;
  - the status area's accessible text includes "N others editing" with names;
  - an `uploading` block whose `uploadedBy` is absent from `presence` shows "Upload interrupted" with Remove; Retry shows only for the uploader.
- [ ] **Steps 2–4:** RED → implement → GREEN. Run stylelint, typecheck and `make lint`.
- [ ] **Step 5:** Commit `feat(collab): presence, status and shared uploads (DS-92)`.

### Task 6: Docs, manifest, playground and size

**Files:**

- `docs/components/CollaborativeRichTextEditor.md`:
  - TL;DR, with the import from `@eocrm/design-system/collab` and installing `yjs`;
  - transport wiring for eocrm's API + SSE;
  - persistence guidance: store the update log, snapshot with `toRichDoc`, migrate with `fromRichDoc`;
  - presence relaying and status;
  - when NOT to use;
  - anti-patterns;
  - a props table via `npm run build:docs`. Extend the generator if it can't see subpath components, and say so.
- An `AI-PRIMER.md` line.
- A CLUSTERS entry in both maps, then `npm run build:manifest`.
- The playground: `CollaborativeRichTextEditorDemo.tsx`, with two editors side by side over two `Y.Doc`s and an in-memory relay with about 300ms latency, an "offline" toggle per side, and presence relayed. Wire it into the four places.
- `size-budgets.json`: a `collab` bundle with `yjs` external.
- README: a short `/collab` install note.

- [ ] **Step 1:** Docs and generators.
- [ ] **Step 2:** Demo and wiring.
- [ ] **Step 3:** From the root run `make test && make lint && npm run format:check && npm run typecheck && npm run build -w @eocrm/design-system && npm run size -w @eocrm/design-system`. Every exit code must be 0.
- [ ] **Step 4:** Commit `docs(collab): docs, manifest, playground demo (DS-92)`.
