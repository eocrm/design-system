# RichTextEditor — Undo / Redo slice (Slice 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Built-in undo/redo for `<RichTextEditor>` — ⌘Z / ⌘⇧Z / ⌘Y + toolbar Undo/Redo buttons, with typing coalesced into sensible steps.

**Architecture:** A pure `history.ts` module (snapshots of `{doc, selection}`, coalescing). The editor records every committed state in the existing `commit` funnel, runs undo/redo through the existing `onChange` + selection-restore, and clears history when `value` is replaced from outside. No new public API.

**Tech Stack:** TypeScript, React 19, Vitest + RTL (jsdom — `globals: true`, so do NOT import `describe`/`it`/`expect`/`vi`).

**Spec:** `docs/superpowers/specs/2026-06-19-richtext-editor-undo-redo-design.md`

---

## Context the engineer needs

- **`commit`** (`RichTextEditor.tsx:200`) is the single funnel for the editor's own edits: `const commit = useCallback((result: {doc, selection}) => { if (result.doc === latest.current.value) return; pendingSelectionRef.current = result.selection; latest.current.onChange(result.doc); }, [])`. This task adds a `kind` param + history recording here.
- **`latest`** ref holds `{ value, onChange, readOnly }` (`latest.current.*`), updated every render.
- **`pendingSelectionRef` + `useLayoutEffect([value])`** (`:285`) restore the caret after a model-driven re-render (guarded on a non-null pending selection).
- **`beforeinput`** handler (`:299`) — handles pending-mark insert (calls `commit(...)`), then generic `applyInput` (calls `commit(result)`), preventDefault on supported inputTypes. This is where the typing `kind` + the `historyUndo`/`historyRedo` safety net go.
- **`compositionend`** handler commits IME text.
- **`onKeyDown`** (`:391`) already handles ⌘K (`if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); openLinkEditor(); return; }`). The ⌘Z/⌘⇧Z/⌘Y branches go just before it.
- **Toolbar** (`RichTextToolbar.tsx`) is presentational; the editor passes it state + callbacks. It renders a block-type `DropdownMenu` first, then `<span className={styles.toolbarSep} aria-hidden="true" />`, then mark buttons, a Link button, a separator, and list buttons. Undo/Redo go at the very start.
- **Icons** live in `icons.tsx` (inline SVGs spreading a shared `base`). **i18n** keys live in `src/i18n/{messages,en,ru}.ts` under `richTextEditor`.
- **Vitest globals** on; the editor test file mocks `readSelection` via `mockReadSelection` and wraps renders in `<I18nProvider locale="en">`.
- Run one file: `cd packages/design-system && npm test -- src/components/RichTextEditor/<file>`. Full gate (repo root): `make test && make build-lib && make lint && npm run format:check`.

## File structure

- **Create** `engine`-free pure module `src/components/RichTextEditor/history.ts` (+ `history.test.ts`).
- **Modify** `src/i18n/{messages,en,ru}.ts` (undo/redo keys) + `icons.tsx` (UndoIcon/RedoIcon).
- **Modify** `RichTextToolbar.tsx` (+ test) — Undo/Redo buttons.
- **Modify** `RichTextEditor.tsx` (+ test) — wiring.
- **Modify** `RichTextEditorDemo.tsx`, `RichTextEditor.tsx` JSDoc, `AGENTS.md` — docs.

---

## Task 1: `history.ts` pure module

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/history.ts`
- Create: `packages/design-system/src/components/RichTextEditor/history.test.ts`

- [ ] **Step 1: Write the failing test**

Create `history.test.ts`:

```ts
import { reset, record, undo, redo, canUndo, canRedo } from './history';
import type { Snapshot } from './history';
import type { RichDoc } from '../RichText/engine/model';

const mkDoc = (id: string): RichDoc => ({
  blocks: [{ id, type: 'paragraph', inlines: [{ text: id, marks: [] }] }],
});
const sa: Snapshot = { doc: mkDoc('a'), selection: null };
const sb: Snapshot = { doc: mkDoc('b'), selection: null };
const sc: Snapshot = { doc: mkDoc('c'), selection: null };

describe('history reset', () => {
  it('starts empty around the present', () => {
    const h = reset(sa);
    expect(h.present).toBe(sa);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });
});

describe('history record', () => {
  it('pushes a new step (present → past) and can undo', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    expect(h.present).toBe(sb);
    expect(h.past).toEqual([sa]);
    expect(canUndo(h)).toBe(true);
  });

  it('coalesces same-kind edits within the window', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'type', 1200);
    expect(h.present).toBe(sc);
    expect(h.past).toEqual([sa]);
  });

  it('breaks coalescing when the window elapses', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'type', 2000);
    expect(h.past).toEqual([sa, sb]);
  });

  it('breaks coalescing on a kind change', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'delete', 1100);
    expect(h.past).toEqual([sa, sb]);
  });

  it('never coalesces "other"', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = record(h, sc, 'other', 1050);
    expect(h.past).toEqual([sa, sb]);
  });

  it('clears the redo future on a new record', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = undo(h);
    h = record(h, sc, 'other', 1100);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(sc);
  });

  it('is a no-op when the doc is unchanged', () => {
    const h = reset(sa);
    expect(record(h, sa, 'type', 1000)).toBe(h);
  });

  it('caps the past length at 200', () => {
    let h = reset(sa);
    for (let i = 0; i < 250; i += 1) {
      h = record(h, { doc: mkDoc('x' + i), selection: null }, 'other', i * 1000);
    }
    expect(h.past.length).toBe(200);
  });
});

describe('history undo/redo', () => {
  it('undo moves present back and into future', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = undo(h);
    expect(h.present).toBe(sa);
    expect(h.future).toEqual([sb]);
    expect(canRedo(h)).toBe(true);
  });

  it('redo re-applies', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = redo(undo(h));
    expect(h.present).toBe(sb);
    expect(h.future).toEqual([]);
  });

  it('undo/redo are no-ops at the boundaries', () => {
    const h = reset(sa);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('an edit after undo starts a fresh step (no merge across the undo)', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = undo(h);
    h = record(h, sc, 'type', 1100);
    expect(h.past).toEqual([sa]);
    expect(h.future).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/history.test.ts`
Expected: FAIL — `./history` not found.

- [ ] **Step 3: Implement `history.ts`**

```ts
// history.ts — pure undo/redo history for <RichTextEditor>. Snapshots of
// { doc, selection }; consecutive same-kind edits (typing, deleting) coalesce
// into one step within a short window. `now` is injected so this module stays
// pure and deterministically testable.
import type { RichDoc, Range } from '../RichText/engine/model';

export interface Snapshot {
  doc: RichDoc;
  selection: Range | null;
}

/** The kind of edit that produced a snapshot — drives typing/deleting coalescing. */
export type EditKind = 'type' | 'delete' | 'other';

export interface History {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  /** Kind of the last recorded step (for coalescing); null after reset/undo/redo. */
  lastKind: EditKind | null;
  /** Timestamp of the last record (for the pause-based coalescing break). */
  lastAt: number;
}

/** Consecutive same-kind edits within this many ms merge into one undo step. */
const COALESCE_MS = 600;
/** Max retained past entries (immutable snapshots structurally share blocks). */
const CAP = 200;

/** A fresh history whose only state is `present` (mount + external value replace). */
export function reset(present: Snapshot): History {
  return { past: [], present, future: [], lastKind: null, lastAt: 0 };
}

/**
 * Record a newly committed state. Coalesces with the previous step when it's the
 * same non-`other` kind within `COALESCE_MS`; otherwise pushes the prior present
 * onto `past` (capped) and clears `future`. A no-op (same doc) returns `h`.
 */
export function record(h: History, next: Snapshot, kind: EditKind, now: number): History {
  if (next.doc === h.present.doc) return h;
  const coalesce = kind !== 'other' && kind === h.lastKind && now - h.lastAt < COALESCE_MS;
  if (coalesce) {
    return { ...h, present: next, lastAt: now };
  }
  return {
    past: [...h.past, h.present].slice(-CAP),
    present: next,
    future: [],
    lastKind: kind,
    lastAt: now,
  };
}

/** Move one step back. No-op when there's nothing to undo. */
export function undo(h: History): History {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    lastKind: null,
    lastAt: 0,
  };
}

/** Move one step forward. No-op when there's nothing to redo. */
export function redo(h: History): History {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    lastKind: null,
    lastAt: 0,
  };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/history.test.ts && npm run typecheck`
Expected: PASS (all cases) + clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/history.ts packages/design-system/src/components/RichTextEditor/history.test.ts
git commit -m "feat(RichTextEditor): pure undo/redo history model"
```

---

## Task 2: i18n keys + Undo/Redo icons

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts`
- Modify: `packages/design-system/src/components/RichTextEditor/icons.tsx`

- [ ] **Step 1: Add keys to the `Messages` interface**

In `messages.ts`, inside the `richTextEditor` block, after the `link*` keys (the last keys before the block closes), add:

```ts
/** aria-label on the toolbar Undo button. */
undo: string;
/** aria-label on the toolbar Redo button. */
redo: string;
```

- [ ] **Step 2: Add the English values**

In `en.ts`, inside `richTextEditor`, after the `link*` values, add:

```ts
    undo: 'Undo',
    redo: 'Redo',
```

- [ ] **Step 3: Add the Russian values**

In `ru.ts`, inside `richTextEditor`, after the `link*` values, add:

```ts
    undo: 'Отменить',
    redo: 'Повторить',
```

- [ ] **Step 4: Add the icons**

In `icons.tsx`, after the `LinkIcon` function, add:

```tsx
export function UndoIcon() {
  return (
    <svg {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-2" />
    </svg>
  );
}
export function RedoIcon() {
  return (
    <svg {...base}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h2" />
    </svg>
  );
}
```

- [ ] **Step 5: Verify**

Run: `cd packages/design-system && npm run typecheck && npm test -- src/i18n`
Expected: PASS (the `Messages` type forces en/ru parity).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): undo/redo i18n keys + icons"
```

---

## Task 3: Toolbar Undo/Redo buttons

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.test.tsx`

- [ ] **Step 1: Write the failing tests**

First update the `renderTb` helper in `RichTextToolbar.test.tsx` to supply the new required callbacks. Replace the helper with:

```tsx
function renderTb(props: Partial<React.ComponentProps<typeof RichTextToolbar>> = {}) {
  const onToggleMark = vi.fn();
  const onSetBlock = vi.fn();
  const onToggleList = vi.fn();
  const onOpenLink = vi.fn();
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextToolbar
        activeMarks={[]}
        block={{ type: 'paragraph' }}
        onToggleMark={onToggleMark}
        onSetBlock={onSetBlock}
        onToggleList={onToggleList}
        onOpenLink={onOpenLink}
        onUndo={onUndo}
        onRedo={onRedo}
        {...props}
      />
    </I18nProvider>,
  );
  return { onToggleMark, onSetBlock, onToggleList, onOpenLink, onUndo, onRedo };
}
```

Then add these tests inside `describe('RichTextToolbar', …)`:

```tsx
it('renders Undo and Redo buttons', () => {
  renderTb();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
});

it('disables Undo/Redo when there is nothing to undo/redo', () => {
  renderTb({ canUndo: false, canRedo: false });
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
});

it('enables and fires Undo/Redo when available', async () => {
  const user = userEvent.setup();
  const { onUndo, onRedo } = renderTb({ canUndo: true, canRedo: true });
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  await user.click(screen.getByRole('button', { name: 'Redo' }));
  expect(onUndo).toHaveBeenCalled();
  expect(onRedo).toHaveBeenCalled();
});

it('disables Undo/Redo when the whole toolbar is disabled', () => {
  renderTb({ canUndo: true, canRedo: true, disabled: true });
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextToolbar.test.tsx`
Expected: FAIL — no Undo/Redo buttons; `onUndo`/`onRedo`/`canUndo`/`canRedo` props don't exist (TS error).

- [ ] **Step 3: Add the props + buttons**

In `RichTextToolbar.tsx`:

1. Add `UndoIcon, RedoIcon` to the `./icons` import.

2. In `RichTextToolbarProps`, after the existing `onOpenLink` prop, add:

```tsx
  /** Whether an undo step is available (drives the Undo button's enabled state). */
  canUndo?: boolean;
  /** Whether a redo step is available. */
  canRedo?: boolean;
  /** Undo the last change. */
  onUndo: () => void;
  /** Redo the last undone change. */
  onRedo: () => void;
```

3. Destructure them in the function signature (with defaults): `canUndo = false, canRedo = false, onUndo, onRedo`.

4. Render the two buttons + a separator as the FIRST children of the toolbar `<div>` (immediately after `<div className={styles.toolbar} role="toolbar" …>` opens, before the block-type `<DropdownMenu>`):

```tsx
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        aria-label={t('richTextEditor.undo')}
        disabled={disabled || !canUndo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onUndo}
      >
        <UndoIcon />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        aria-label={t('richTextEditor.redo')}
        disabled={disabled || !canRedo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRedo}
      >
        <RedoIcon />
      </Button>
      <span className={styles.toolbarSep} aria-hidden="true" />
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextToolbar.test.tsx && npm run typecheck`

NOTE: `RichTextEditor.tsx` renders `<RichTextToolbar …>` without `onUndo`/`onRedo`, so typecheck will fail there until Task 4. To keep this task self-contained, add temporary no-op placeholders at that one call site: `onUndo={() => {}}` and `onRedo={() => {}}` with a `// wired in Task 4` comment (Task 4 replaces them). Re-run typecheck → clean.

Expected: toolbar tests pass; typecheck clean after the placeholders.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx packages/design-system/src/components/RichTextEditor/RichTextToolbar.test.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx
git commit -m "feat(RichTextEditor): toolbar Undo/Redo buttons"
```

---

## Task 4: Editor wiring

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `RichTextEditor.test.tsx` (reuse the existing `mockReadSelection` + `I18nProvider` setup). Add a new describe block:

```ts
describe('RichTextEditor undo/redo', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  it('records an edit and undoes it via the toolbar', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    // Initially nothing to undo.
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    // Make an edit: toggle bold over the selection.
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('strong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    // Undo reverts it.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  it('clears history when value is replaced externally', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return (
        <div>
          <button onClick={() => setDoc({ blocks: [{ id: 'z', type: 'paragraph', inlines: [{ text: 'new', marks: [] }] }] })}>
            replace
          </button>
          <RichTextEditor value={doc} onChange={setDoc} toolbar />
        </div>
      );
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    // External replacement → history cleared.
    await user.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});
```

(Ensure `useState`, `render`, `screen`, `userEvent`, `RichTextEditor`, `RichDoc`, `I18nProvider`, `mockReadSelection` are imported at the top — they already are from prior slices.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx -t "undo/redo"`
Expected: FAIL — no Undo button wiring / history; the toolbar's Undo button is always disabled (placeholder no-ops).

- [ ] **Step 3: Wire the editor**

In `RichTextEditor.tsx`:

**(a) Imports** — add:

```tsx
import {
  reset as historyReset,
  record as historyRecord,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
} from './history';
import type { History, EditKind } from './history';
```

**(b) State/ref** — near the other `useState`/`useRef` hooks inside the component:

```tsx
const historyRef = useRef<History>(historyReset({ doc: value, selection: null }));
const [canUndo, setCanUndo] = useState(false);
const [canRedo, setCanRedo] = useState(false);
const syncHistoryFlags = useCallback(() => {
  setCanUndo(historyCanUndo(historyRef.current));
  setCanRedo(historyCanRedo(historyRef.current));
}, []);
```

**(c) `commit` gains `kind`** — replace the existing `commit` definition with:

```tsx
const commit = useCallback(
  (result: { doc: RichDoc; selection: Range }, kind: EditKind = 'other') => {
    if (result.doc === latest.current.value) return;
    historyRef.current = historyRecord(
      historyRef.current,
      { doc: result.doc, selection: result.selection },
      kind,
      Date.now(),
    );
    syncHistoryFlags();
    pendingSelectionRef.current = result.selection;
    latest.current.onChange(result.doc);
  },
  [syncHistoryFlags],
);
```

**(d) `onUndo` / `onRedo`** — add after `commit`:

```tsx
const onUndo = useCallback(() => {
  const h = historyRef.current;
  if (!historyCanUndo(h)) return;
  const next = historyUndo(h);
  historyRef.current = next;
  syncHistoryFlags();
  pendingSelectionRef.current = next.present.selection;
  latest.current.onChange(next.present.doc);
}, [syncHistoryFlags]);

const onRedo = useCallback(() => {
  const h = historyRef.current;
  if (!historyCanRedo(h)) return;
  const next = historyRedo(h);
  historyRef.current = next;
  syncHistoryFlags();
  pendingSelectionRef.current = next.present.selection;
  latest.current.onChange(next.present.doc);
}, [syncHistoryFlags]);
```

**(e) External-reset detection** — in the existing `useLayoutEffect([value])` (the selection-restore one at `:285`), add the reset check at the TOP of the effect body, before the selection restore:

```tsx
useLayoutEffect(() => {
  // A `value` the editor didn't produce (every internal edit/undo/redo keeps
  // present.doc === value) → an outside replacement → start fresh history.
  if (value !== historyRef.current.present.doc) {
    historyRef.current = historyReset({ doc: value, selection: null });
    syncHistoryFlags();
  }
  const root = rootRef.current;
  const pending = pendingSelectionRef.current;
  if (root && pending) {
    writeSelection(root, pending);
    pendingSelectionRef.current = null;
  }
}, [value, syncHistoryFlags]);
```

**(f) Typing `kind` at the `beforeinput` call sites** — in the `onBeforeInput` handler:

First, add the undo/redo safety net + a `kindOf` helper. At the TOP of `onBeforeInput`, right after `if (ro || isComposingRef.current) return;` and before `const range = readSelection(root);`, add:

```tsx
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

Then change the pending-marks commit to pass `'type'`:

```tsx
commit({ doc: marked, selection: inserted.selection }, 'type');
```

And change the generic commit to pass the mapped kind. Replace `e.preventDefault(); commit(result);` (the lines after the `applyInput` result null-check) with:

```tsx
e.preventDefault();
const kind: EditKind =
  e.inputType === 'insertText' ||
  e.inputType === 'insertCompositionText' ||
  e.inputType === 'insertReplacementText'
    ? 'type'
    : e.inputType.startsWith('delete')
      ? 'delete'
      : 'other';
commit(result, kind);
```

Add `onUndo, onRedo` to the `beforeinput` `useEffect` dependency array (currently `[commit]` → `[commit, onUndo, onRedo]`).

**(g) `compositionend` `kind`** — in the `onCompositionEnd` handler, change `if (result) commit(result);` to `if (result) commit(result, 'type');`.

**(h) Keyboard** — in `onKeyDown`, add BEFORE the existing ⌘K branch:

```tsx
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

Add `onUndo, onRedo` to the `onKeyDown` `useCallback` dependency array.

**(i) Toolbar props** — replace the Task-3 placeholders `onUndo={() => {}}`/`onRedo={() => {}}` on `<RichTextToolbar …>` with the real wiring + flags:

```tsx
canUndo = { canUndo };
canRedo = { canRedo };
onUndo = { onUndo };
onRedo = { onRedo };
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx && npm run typecheck`
Expected: PASS — the two new undo/redo tests + every existing editor test (no regression).

- [ ] **Step 5: Run the whole RichTextEditor suite**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor`
Expected: PASS across history, toolbar, editor, commands, selection, input, shortcuts, links, RichTextLinkEditor.

- [ ] **Step 6: Manual browser verification (Playwright)**

Start the playground (`make dev`), open the RichTextEditor demo, and verify in a toolbar editor:

1. Type a burst (e.g. "hello") → ⌘Z undoes the whole burst at once → ⌘⇧Z redoes it.
2. Type "hel", pause >1s, type "lo" → two ⌘Z presses undo "lo" then "hel" separately.
3. Type text, click Bold (or ⌘B) → ⌘Z undoes the bold (text remains).
4. Toolbar Undo/Redo buttons reflect availability (disabled at the ends) and work on click.
5. The browser's own contentEditable undo never fires (no doubled/desynced content); ⌘Z is fully owned by the editor.
6. Replace `value` externally (the demo seeds from `fromMarkdown` on reload; or use a harness) → Undo disabled (history cleared).

Record outcomes in the PR.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire undo/redo — history recording, ⌘Z/⌘⇧Z/⌘Y, toolbar"
```

---

## Task 5: Demo + JSDoc + AGENTS.md

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx` (JSDoc only)
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Update the demo description**

In `RichTextEditorDemo.tsx`, the "Editable with toolbar" `<Example>`'s `description` — append a sentence about undo/redo. Find that example's `description="…"` and add to it:

```
 Undo/redo: ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z (or the toolbar Undo/Redo buttons).
```

(Keep the existing description text; just append this sentence inside the same string.)

- [ ] **Step 2: Verify the playground typechecks**

Run: `cd /Users/dpws/projects/design-system && make build-lib && npm run typecheck --workspace playground`
Expected: PASS.

- [ ] **Step 3: Update the component JSDoc**

In `RichTextEditor.tsx`, in the main component JSDoc description, add a sentence (after the paste sentence from the previous slice):

```
 * ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z (and the toolbar Undo/Redo buttons) undo and redo.
```

And in the `@remarks Anti-patterns` block, REMOVE the bullet:

```
 * - ❌ Expecting undo/redo — not in this slice.
```

(Leave the other anti-pattern bullets intact.)

- [ ] **Step 4: Update `AGENTS.md`**

In `packages/design-system/AGENTS.md`, in the `### <RichTextEditor>` section:

1. After the toolbar bullet list (Mark buttons / Block-type dropdown / List toggles / Link button), add:

```markdown
- **Undo / Redo buttons** — undo/redo the last change; disabled at the ends of the history.
```

2. Add a new paragraph after the "Import:" paragraph:

```markdown
**Undo/redo:** built in — ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or ⌘/Ctrl+Y) redo, plus the toolbar Undo/Redo buttons. Typing coalesces into one step (short bursts), and replacing `value` from outside the editor clears the history.
```

3. In the "When NOT to use:" line, change `No undo/redo yet (later slice).` to remove that clause (undo/redo now exists) — e.g. just end the sentence after the read-only note. Confirm the exact current wording and edit minimally.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(RichTextEditor): undo/redo demo note, JSDoc + AGENTS.md"
```

---

## Final gate (before the Rule-8 review loop + PR)

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all green; grep prints `0`. No manifest drift expected (no new component; toolbar already composes `Button`). Then run the library Hard-rule-8 review-fix loop before pushing.

---

## Self-review (plan vs. spec)

**Spec coverage:**

- Pure `history.ts` (reset/record/undo/redo/canUndo/canRedo, coalescing, cap) → Task 1. ✔
- i18n undo/redo + icons → Task 2. ✔
- Toolbar Undo/Redo buttons (canUndo/canRedo/onUndo/onRedo, disabled, action-not-toggle, start of toolbar) → Task 3. ✔
- Editor wiring: historyRef + flags; `commit(result, kind)` recording; kind at call sites (`type`/`delete`/`other`); onUndo/onRedo; external-reset in the value effect; ⌘Z/⌘⇧Z/⌘Y; historyUndo/historyRedo beforeinput net; toolbar props → Task 4. ✔
- Demo + JSDoc (remove "not in this slice") + AGENTS.md → Task 5. ✔
- No public API / no manifest drift / internal module → respected.

**Placeholder scan:** every code step shows complete code; commands have expected results; the one temporary placeholder (Task 3 → replaced in Task 4) is explicit. No TBD/TODO.

**Type consistency:** `Snapshot`/`History`/`EditKind`, `record(h, next, kind, now)`, `reset(present)`, `undo`/`redo`/`canUndo`/`canRedo`, the aliased imports (`historyReset`/`historyRecord`/`historyUndo`/`historyRedo`/`historyCanUndo`/`historyCanRedo`), `commit(result, kind)`, and the toolbar `canUndo`/`canRedo`/`onUndo`/`onRedo` props are used identically across tasks. The editor's `canUndo`/`canRedo` state names intentionally differ from the imported (aliased) `historyCanUndo`/`historyCanRedo` functions — no clash. ✔
