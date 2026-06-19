# RichTextEditor — Undo / Redo slice (Slice 6) Design

**Status:** approved (brainstorm), ready for plan
**Date:** 2026-06-19
**Component:** `@eocrm/design-system` → `src/components/RichTextEditor/`
**Depends on:** the RichText engine + editor (Slices 1–5, all shipped).

## Goal

Built-in undo/redo for `<RichTextEditor>`: **⌘/Ctrl+Z** undo, **⌘/Ctrl+Shift+Z** and **⌘/Ctrl+Y** redo, plus **Undo / Redo toolbar buttons** (when `toolbar` is on). Typing coalesces into sensible undo steps. The editor is controlled, so history lives inside the editor and routes through the existing `onChange` round-trip — the consumer does nothing.

## Non-goals (YAGNI)

- **No public undo/redo API** on `<RichTextEditor>` (no new props, no imperative handle). It's built-in, like the toolbar/links/paste.
- **No persistence / cross-session history**, no collaborative/OT merging, no per-field history sharing.
- **No undo across an external `value` replacement** — replacing `value` from outside the editor starts a fresh history (per the brainstorm decision).

## Architecture

```
src/components/RichTextEditor/
  history.ts             ← (new) pure history model: reset / record / undo / redo / canUndo / canRedo
  history.test.ts        ← (new)
  RichTextEditor.tsx     ← (modify) historyRef + canUndo/canRedo state; commit(result, kind) records;
                            onUndo/onRedo; ⌘Z/⌘⇧Z/⌘Y keys; historyUndo/historyRedo beforeinput;
                            external-reset detection in the value useLayoutEffect
  RichTextToolbar.tsx    ← (modify) Undo/Redo buttons (canUndo/canRedo/onUndo/onRedo props)
  icons.tsx              ← (modify) add UndoIcon, RedoIcon
src/i18n/{messages,en,ru}.ts  ← (modify) add `undo`, `redo`
```

**No new public exports.** `history.ts` and its types are internal (it lives in `components/RichTextEditor/`, so `structure.test.ts`'s four-file rule does not apply). `<RichTextEditor>`'s public props are unchanged.

**Where history lives — the `commit` funnel.** Every edit the editor makes already routes through `commit({ doc, selection })` (`RichTextEditor.tsx:200`). That is the single recording point: the editor knows each change is its own edit (vs. a `value` prop echo or an external replacement). History recording in `commit` is why this must be built-in, not a consumer hook — only the editor sees edit _kinds_ (for coalescing) and can distinguish its own edits from external `value` changes.

**Data flow:**

1. **Record:** `commit(result, kind)` → `historyRef.current = record(historyRef.current, { doc: result.doc, selection: result.selection }, kind, Date.now())` → update `canUndo`/`canRedo` state → `onChange(result.doc)` (+ stash selection). `kind` ∈ `'type' | 'delete' | 'other'`.
2. **Undo/redo:** `onUndo`/`onRedo` move snapshots between `past`/`present`/`future` and route the resulting doc through the same `onChange` + `pendingSelectionRef` selection-restore that marks/links/paste use.
3. **External reset:** after any internal edit/undo/redo, `value === historyRef.current.present.doc`. So a render where `value !== present.doc` means an outside replacement → `history = reset({ doc: value, selection: null })` (clears the stack).
4. **Button state:** `canUndo`/`canRedo` are editor state, updated at each history mutation, passed to the toolbar.

## The history model (`history.ts`, pure)

```ts
import type { RichDoc, Range } from '../RichText/engine/model';

export interface Snapshot {
  doc: RichDoc;
  selection: Range | null;
}
export type EditKind = 'type' | 'delete' | 'other';
export interface History {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  lastKind: EditKind | null; // kind of the last recorded step (for coalescing)
  lastAt: number; // timestamp of the last record (for the pause break)
}

export function reset(present: Snapshot): History;
export function record(h: History, next: Snapshot, kind: EditKind, now: number): History;
export function undo(h: History): History;
export function redo(h: History): History;
export function canUndo(h: History): boolean; // past.length > 0
export function canRedo(h: History): boolean; // future.length > 0
```

**Constants:** `COALESCE_MS = 600`, `CAP = 200`.

**`reset(present)`** → `{ past: [], present, future: [], lastKind: null, lastAt: 0 }`.

**`record(h, next, kind, now)`:**

- No-op: if `next.doc === h.present.doc`, return `h` unchanged.
- **Coalesce** iff `kind !== 'other' && kind === h.lastKind && now - h.lastAt < COALESCE_MS`: keep `past`/`future`, set `present = next`, `lastAt = now`. (The group's single undo boundary — its pre-group state — already sits on top of `past`.)
- **New step** otherwise: `past = [...h.past, h.present].slice(-CAP)`, `present = next`, `future = []`, `lastKind = kind`, `lastAt = now`.

**`undo(h)`** — if `h.past.length === 0` return `h`; else `{ past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKind: null, lastAt: 0 }`. `lastKind: null` so the first edit after an undo always starts a fresh step (no merge across the undo).

**`redo(h)`** — if `h.future.length === 0` return `h`; else `{ past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKind: null, lastAt: 0 }`.

**Why `now` is a parameter:** keeps `history.ts` pure + deterministically testable (tests pass explicit timestamps). The editor supplies `Date.now()` (available in component runtime).

**Coalescing behavior:** "hello" typed fast → one step; "hel" · pause >600ms · "lo" → two; type then ⌘B (`'type'` then `'other'`) → two; a backspace run (`'delete'`) coalesces separately from typing; after an undo the next keystroke always starts a fresh step.

## Editor wiring (`RichTextEditor.tsx`)

**State/ref:**

```ts
const historyRef = useRef<History>(reset({ doc: value, selection: null }));
const [canUndo, setCanUndo] = useState(false);
const [canRedo, setCanRedo] = useState(false);
const syncFlags = () => {
  setCanUndo(hCanUndo(historyRef.current));
  setCanRedo(hCanRedo(historyRef.current));
};
```

(History functions imported aliased — e.g. `hUndo`/`hRedo`/`hCanUndo`/`hCanRedo` — to avoid clashing with the editor's `onUndo`/`onRedo`.)

**`commit` gains `kind` (default `'other'`):** record before emitting (keeping the existing reference-equal no-op guard first):

```ts
const commit = useCallback((result, kind: EditKind = 'other') => {
  if (result.doc === latest.current.value) return;
  historyRef.current = record(
    historyRef.current,
    { doc: result.doc, selection: result.selection },
    kind,
    Date.now(),
  );
  syncFlags();
  pendingSelectionRef.current = result.selection;
  latest.current.onChange(result.doc);
}, []);
```

**Kind at the call sites** (only the text paths pass a kind; all others keep `'other'`):

- `beforeinput` pending-marks insert → `commit({ doc: marked, selection: inserted.selection }, 'type')`.
- `beforeinput` generic `applyInput` → `commit(result, kindOf(e.inputType))`, where `kindOf('insertText'|'insertCompositionText'|'insertReplacementText') = 'type'`, `kindOf(t.startsWith('delete')) = 'delete'`, else `'other'` (so `insertParagraph`/Enter and `insertFromPaste` are `'other'` — they break the typing group).
- `compositionend` → `commit(result, 'type')`.
- `stageOrToggleMark`, toolbar mark/block/list, link apply/remove, paste `insertFragment`, Tab indent → `'other'` (default).

**`onUndo` / `onRedo`** (stable, ref-based, empty deps):

```ts
const onUndo = useCallback(() => {
  const h = historyRef.current;
  if (!hCanUndo(h)) return;
  const next = hUndo(h);
  historyRef.current = next;
  syncFlags();
  pendingSelectionRef.current = next.present.selection;
  latest.current.onChange(next.present.doc);
}, []);
// onRedo mirrors with hCanRedo / hRedo.
```

If `next.present.selection` is `null` (the initial baseline), the existing selection-restore effect simply skips writing (it already guards on a non-null pending selection).

**External-reset detection** folds into the existing `useLayoutEffect([value])` (`RichTextEditor.tsx:285`), before the selection restore:

```ts
useLayoutEffect(() => {
  if (value !== historyRef.current.present.doc) {
    historyRef.current = reset({ doc: value, selection: null });
    syncFlags();
  }
  // …existing selection restore…
}, [value]);
```

This holds because every internal path sets `present.doc` to the doc it then emits via `onChange`, so on the resulting render `value === present.doc`; only an outside replacement breaks that equality.

**Keyboard** (in `onKeyDown`, before the ⌘K branch):

```ts
const mod = e.metaKey || e.ctrlKey;
if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
  e.preventDefault();
  e.stopPropagation();
  onUndo();
  return;
}
if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
  e.preventDefault();
  e.stopPropagation();
  onRedo();
  return;
}
```

`stopPropagation` keeps the shortcut from also triggering a host app's undo (consistent with ⌘K). Add `onUndo`/`onRedo` to the `onKeyDown` dep array.

**`beforeinput` safety net** (covers Edit-menu / trackpad undo, which fire no keydown) — at the top of the `beforeinput` handler, after the `readOnly`/composing guard and before `readSelection`:

```ts
if (e.inputType === 'historyUndo') {
  e.preventDefault();
  onUndo();
  return;
}
if (e.inputType === 'historyRedo') {
  e.preventDefault();
  onRedo();
  return;
}
```

Per gesture these are mutually exclusive with the keydown path (a prevented ⌘Z keydown suppresses the `historyUndo` beforeinput), so no double-fire. Both `preventDefault` so the browser's native contentEditable undo never mutates the DOM out from under the controlled model. (`onUndo`/`onRedo` are stable; add them to the `beforeinput` effect deps.)

**Toolbar** receives `canUndo`, `canRedo`, `onUndo`, `onRedo`.

## Toolbar Undo/Redo buttons (`RichTextToolbar.tsx`)

- New props: `canUndo?: boolean`, `canRedo?: boolean`, `onUndo: () => void`, `onRedo: () => void`.
- Render two icon `Button`s at the **start** of the toolbar (undo/redo conventionally sit far-left), followed by a `toolbarSep` separator before the block-type dropdown.
- Each: `size="sm"`, `variant="ghost"`, `iconOnly`, `aria-label={t('richTextEditor.undo'|'redo')}`, `onMouseDown={(e) => e.preventDefault()}` (preserve the editor selection), `onClick={onUndo|onRedo}`. **Action buttons, not toggles** — `disabled={disabled || !canUndo}` (resp. `!canRedo`); no `aria-pressed`.
- `UndoIcon` / `RedoIcon` added to `icons.tsx` (curved-arrow back/forward, matching the existing inline-SVG style).

## i18n

New `richTextEditor` keys in `messages.ts` + `en.ts` + `ru.ts`:

| key    | en     | ru          |
| ------ | ------ | ----------- |
| `undo` | `Undo` | `Отменить`  |
| `redo` | `Redo` | `Повторить` |

## Testing

- **`history.test.ts`** (pure — the bulk): `record` (new step pushes `present`→`past`; coalesce same-kind within window leaves `past` and updates `present`; break on kind-change, on window-elapsed, on `'other'`; `CAP` drops the oldest; record clears `future`; same-doc no-op returns the same `History`); `undo`/`redo` (move snapshots, reset `lastKind`, boundary no-ops); `reset`; `canUndo`/`canRedo`.
- **`RichTextToolbar.test.tsx`** (extend): Undo/Redo buttons present (names "Undo"/"Redo"); disabled when `!canUndo`/`!canRedo`; disabled when `disabled`; fire `onUndo`/`onRedo` on click.
- **`RichTextEditor.test.tsx`** (extend, using the existing `mockReadSelection` + harness): after an edit the Undo toolbar button enables; clicking Undo (and a ⌘Z keydown) calls `onChange` with the prior doc; redo re-applies; an external `value` replacement leaves Undo disabled (history cleared).
- **Browser (Playwright, manual):** type a burst → ⌘Z undoes the whole burst → ⌘⇧Z redoes; pause-separated bursts undo separately; ⌘B then ⌘Z undoes the bold (not the text); toolbar Undo/Redo buttons + their disabled states; native contentEditable undo is suppressed (no doubled/desynced state); replacing `value` externally clears history.

## Packaging (CLAUDE.md core invariant)

- **No new public API** — `history.ts` + types internal; `<RichTextEditor>` props unchanged; nothing added to `src/index.ts`.
- **No manifest drift** — no new component; the toolbar already composes `Button`, so the Undo/Redo buttons add no new design-system composition.
- **`structure.test.ts`** unaffected (`history.ts` lives in `components/RichTextEditor/`, not a `components/<Name>/` dir).
- **i18n:** `undo`/`redo` in all three i18n files (Rule 9).
- **Demo:** the existing toolbar editors gain Undo/Redo for free — update `RichTextEditorDemo`'s description to mention undo/redo (⌘Z/⌘⇧Z + buttons). No new `<Example>` required.
- **Docs:** remove the `❌ Expecting undo/redo — not in this slice` anti-pattern from the `RichTextEditor` JSDoc `@remarks` and mention undo/redo in the description; in `AGENTS.md`, drop "No undo/redo yet" and add an undo/redo note (keyboard + toolbar, typing coalesces, clears on external `value` replace).
- **SCSS:** none required (the Undo/Redo buttons reuse the existing toolbar button styling; the separator reuses `toolbarSep`).

## Risks / decisions (resolved)

- **Controlled-value reconciliation:** the `value === present.doc` invariant makes external-replacement detection a single equality check — no extra "last emitted" bookkeeping.
- **Native contentEditable undo:** suppressed at both the keydown (`preventDefault`) and `beforeinput` (`historyUndo`/`historyRedo` `preventDefault`) layers, so the browser never mutates the DOM against the model.
- **Coalescing determinism:** `now` is injected, so `history.ts` is pure and fully unit-testable without faking timers.
- **Memory:** immutable model → snapshots structurally share unchanged blocks; `CAP = 200` bounds the rest.
