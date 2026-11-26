# RichTextEditor shared-editing API; Yjs binding moves to eocrm (DS-96)

## Intent

DS-92 shipped a Yjs binding as `@eocrm/design-system/collab` (0.8.22). Review showed half of it is app
infrastructure and a persisted data format (Y schema, sync, transport/persistence rules) that the DS can't test
or version safely. Decision (dpws, 2026-11-26): move everything Yjs/server-aware to eocrm (EO-287); keep the
editor-side capabilities in the DS as a **yjs-free public API on `RichTextEditor`**. No backward compatibility;
release as 0.9.0.

## Approaches

- **Public props on RichTextEditor — chosen.** Turns the internal `collabSeam` into a documented, typed API any
  sync layer (Yjs or not) can drive. Presence/status UI stays in the DS (geometry, tokens, a11y, i18n).
- Hooks only, UI in eocrm — smaller DS surface but eocrm re-implements DOM caret geometry. Rejected.
- Keep `/collab` — the DS keeps owning a stored data format. Rejected.

## API (all optional; none set = today's behaviour, byte-identical)

```ts
history?: 'internal' | 'external';            // default 'internal'
onUndo?: () => void; onRedo?: () => void;      // used when history='external' (toolbar, ⌘Z, beforeinput)
canUndo?: boolean;   canRedo?: boolean;        // toolbar button state when history='external'
onEdit?: (edit: { kind: 'type' | 'delete' | 'resize' | 'other' | 'silent' }) => void; // before onChange
createBlockId?: () => string;                  // ids for blocks the editor creates
onSelectionChange?: (sel: Range | null) => void; // every selectionchange; null when unfocused / outside
controller?: Ref<RichTextEditorController>;   // { getSelection(); setSelection(r); isComposing() }
onCompositionEnd?: () => void;                 // after the editor committed an IME composition
presence?: readonly RichTextPresence[];        // { id: string; name: string; color: string; selection: Range | null }
syncStatus?: 'synced' | 'connecting' | 'offline';
uploadOwner?: (blockId: string) => 'mine' | 'theirs' | 'orphaned' | undefined;
```

- `history='external'`: the editor keeps no undo history; an outside `value` change is accepted as-is (not a
  rejected edit, no reset) and the caret stays where `controller.setSelection` puts it (default: the editor
  keeps its current model selection, clamped).
- `onEdit` `'silent'`: commits that shouldn't be undo steps (upload settle / failed-upload removal).
- `createBlockId`: used everywhere the editor creates blocks (split, paste, insert, duplicate, attachments) —
  per instance, not global.
- `presence`: drawn by the existing overlay (caret bar + 2s name flag + selection tint in `color`,
  `aria-hidden`, pointer-events none, untrusted-input hardening kept: per-entry try/catch, string coercion,
  colour only via a CSS custom property). Status area accessible text "N others editing: names" (deduped by
  `id`).
- `syncStatus`: indicator (text + icon) in the toolbar row when `toolbar` is true, else below the editable,
  inside the editor root; polite live region rendered whenever `syncStatus` is set; announces changes only.
- `uploadOwner`: `'orphaned'` → "Upload interrupted" + Remove; Retry only when `'mine'` (or when the prop is
  absent, as today).
- `Range` / `Point` model types become public exports (with `RichTextPresence`, `RichTextEditorController`,
  `RichTextEditKind`, `RichTextSyncStatus`, `RichTextUploadOwner`).
- i18n: move `collab.*` keys to `richTextEditor.*` (en + ru).

## Removed

`/collab` subpath (exports map, vite lib entry, dist test), `yjs` optional peer + devDependency (design-system
and playground), CLAUDE.md dependency exception (f), `src/collab/**` (schema, bridge, order, textDiff,
CollaborativeRichTextEditor, presence — presence/status code moves into RichTextEditor first), the
main-entry-no-yjs guard, the `collab` size budget and size-guard yjs external, design-tokens package-boundary
`./collab` entry, CollaborativeRichTextEditor docs / AI-PRIMER line / CLUSTERS entries / generator scan of
`src/collab`, the demo and its four wiring points. `docs/superpowers` DS-92 spec/plan stay as history.

## Docs & demo

`docs/components/RichTextEditor.md` gains "Shared editing (sync hooks)": what each prop is for, the
history='external' contract, a minimal non-Yjs example, and a pointer that eocrm's Yjs binding lives in eocrm
(EO-287). Playground RichTextEditor demo gains "Shared editing hooks": two editors kept in sync by a naive
whole-document relay (last-writer-wins, documented as a toy), presence both ways, a status toggle, external
undo via a shared stack.

## Release

0.9.0: set `BUMP` to minor in `.github/workflows/release.yml` on the branch (and back to patch after release
if the workflow doesn't reset it — check how previous minor bumps were done).
