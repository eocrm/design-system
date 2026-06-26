# RichTextEditor block-controls drag & hover refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `RichTextEditor`'s block reordering feel natural (a floating block drag-preview), make the gutter controls reliably reachable (hover spans the whole editor and hides on exit), and close the block menu when a drag starts.

**Architecture:** Three refinements to the existing block-controls layer, no engine/model/serialization change. (B+C) `RichTextBlockControls` gains a dnd-kit `<DragOverlay>` that floats a DOM snapshot of the dragged block, dims the source, and closes the menu on drag start; it reports drag state up via a new `onDraggingChange` prop. (A) `RichTextEditor` replaces editable-only hover tracking with shell-level tracking: `activeBlockId = hoverBlockId ?? caretBlockId`, where hover is set/kept over the shell and cleared on shell `mouseleave`, guarded (like the existing menu guard) so it never steals during an open menu or a drag.

**Tech Stack:** React + TypeScript, `@dnd-kit/core` (already a dependency), CSS Modules + SCSS tokens, Vitest + Testing Library (jsdom), Playwright (live verification). Spec: `docs/superpowers/specs/2026-06-26-richtexteditor-block-drag-hover-design.md`.

---

## Context the engineer needs (read before starting)

- **Repo rules:** `packages/design-system/CLAUDE.md` (Hard rules) and root `CLAUDE.md`. Relevant here: Rule 3 (tokens only in SCSS — `opacity`, `background`, `box-shadow`, `border-radius` must be `var(--…)`; raw values fail stylelint), Rule 4 (no layout props in component SCSS — `width`/`position`/`top` are set **inline** by JS for overlays, which is the established pattern for `.gutter`/`.dropIndicator`), Rule 7 (JSDoc on every exported member), Rule 8 (pre-push review-fix loop), Rule 9 (i18n — no change here, no new strings).
- **Tokens already present** (`src/styles/tokens.scss`): `--opacity-dragging: 0.4` (comment: "drag-in-progress source element fade" — exactly our source dim), `--opacity-muted: 0.75`, `--color-bg`, `--shadow-lg`, `--radius-md`, `--space-1`, `--space-2`. Do **not** add new tokens.
- **Current hover model** (`RichTextEditor.tsx`): a single `activeBlockId` state, written by a `mouseover` listener on `rootRef` (the editable) AND by a `selectionchange` caret listener, both guarded so an open menu (`blockMenuOpenRef`) can't steal the active block. The gutter (`RichTextBlockControls`) is a sibling of the editable inside `.shell` (anchored by `shellRef`), so hovering it fires no `mouseover` on the editable — the bug.
- **`blockIdFromNode(node)`** walks up from `node` until it reaches `rootRef.current` (the **editable**), returning the nearest `[data-block-id]` or `null`. The gutter lives outside the editable, so a gutter-target hover resolves to `null` — we use that: "null target ⇒ leave `hoverBlockId` unchanged" keeps controls alive over the gutter.
- **Current drag** (`RichTextBlockControls.tsx`): `useDraggable` on the grip + a `DndContext` (PointerSensor, 4px activation) with `onDragMove`/`onDragEnd`/`onDragCancel` computing the drop gap and drawing the `.dropIndicator` line. The component early-returns `null` before the `DndContext` when there's no active block.
- **DragOverlay precedent:** `src/components/Sortable/Sortable.tsx` renders `<DragOverlay>` with a `data-dragging="true"` marker and tracks an `activeId` set in `onDragStart`/cleared in `onDragEnd`/`onDragCancel`. Its tests assert the at-rest invariant (no overlay clone, no `data-dragging` node) rather than simulating a real jsdom drag — follow that precedent: the drag-triggered visuals (ghost + dim + menu-close) are verified in Playwright, not by a synthetic jsdom drag.
- **CSS-module scoping note:** `.attachmentImg`, `.attachmentChip`, etc. are unscoped module classes and the `figure[data-attachment][data-align]` rules are global, so a cloned attachment styles correctly inside the portaled overlay — EXCEPT the UA `<figure>` margin reset is scoped to `.root`/`.shell`; we extend it to `.dragOverlay`. Block typography (`@include prose.prose`) is scoped to `.root`, so the overlay must include the prose mixin to render headings/lists/quotes like the editor.

**Commands** (run from repo root unless noted):

- Single test file: `npx vitest run packages/design-system/src/components/RichTextEditor/<File>.test.tsx`
- Full lib test: `make test` · Typecheck: `make build-lib` · Stylelint: `make lint` · Format: `npm run format:check`

---

## File Structure

- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
  — new `onDraggingChange?` prop; `readBlockSnapshot` exported helper; drag snapshot/dim state + refs; `onDragStart` (snapshot + dim + close menu + report dragging); cleanup in `onDragEnd`/`onDragCancel`; `<DragOverlay>` render. (Tasks 1–2.)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
  — `.dragOverlay` (lifted card, prose) + `.blockDragging` (source dim) + extend the figure-margin reset. (Task 1.)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`
  — `readBlockSnapshot` unit test; at-rest invariant; grip-click-opens-menu regression. (Tasks 1–2.)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
  — split `activeBlockId` into `hoverBlockId ?? caretBlockId`; shell-level `mouseover`/`mouseleave`; `draggingRef`; wire `onDraggingChange`. (Task 3.)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`
  — hover-zone tests. (Task 3.)
- **Modify** `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
  — one-line note in the "Block controls" demo description. (Task 4.)

No new exported public API, no new component, no manifest/AGENTS structural change.

---

## Task 1: Drag preview foundation in `RichTextBlockControls` — snapshot helper + SCSS + at-rest invariant

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`

- [ ] **Step 1: Write the failing test for the snapshot helper**

Add to `RichTextBlockControls.test.tsx` (the file already imports `render`, `screen` from `@testing-library/react`; add `readBlockSnapshot` to the existing import from `./RichTextBlockControls`):

```tsx
import { RichTextBlockControls, readBlockSnapshot } from './RichTextBlockControls';

describe('readBlockSnapshot', () => {
  it('returns the block element outerHTML + measured width', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    p.setAttribute('data-block-id', 'x1');
    p.textContent = 'hello';
    root.appendChild(p);
    // jsdom has no layout; stub the measured width.
    p.getBoundingClientRect = () => ({
      width: 240,
      height: 20,
      top: 0,
      left: 0,
      right: 240,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(readBlockSnapshot(root, 'x1')).toEqual({
      html: '<p data-block-id="x1">hello</p>',
      width: 240,
    });
  });

  it('returns null when the block id is absent or root is null', () => {
    const root = document.createElement('div');
    expect(readBlockSnapshot(root, 'nope')).toBeNull();
    expect(readBlockSnapshot(null, 'x1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`
Expected: FAIL — `readBlockSnapshot is not a function` / import error.

- [ ] **Step 3: Implement the helper**

In `RichTextBlockControls.tsx`, add this exported function near the top (after the `blockRects` helper, before `DraggableGrip`):

```tsx
/**
 * Snapshot a block's rendered DOM for the drag preview: its `outerHTML` (so the
 * floating clone shows the real content — text, marks, mention/link chips, an
 * attachment image — with no separate render path) and its measured `width` (the
 * `<DragOverlay>` is anchored to the tiny grip, so the overlay must be sized to the
 * block explicitly). Returns `null` when the block element is not found. Exported so
 * it can be unit-tested without a real drag.
 */
export function readBlockSnapshot(
  root: HTMLElement | null,
  blockId: string,
): { html: string; width: number } | null {
  const el = root?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(blockId)}"]`);
  if (!el) return null;
  return { html: el.outerHTML, width: el.getBoundingClientRect().width };
}
```

- [ ] **Step 4: Run the helper tests to confirm they pass**

Run: `npx vitest run packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx -t readBlockSnapshot`
Expected: PASS (both cases).

- [ ] **Step 5: Add the SCSS for the overlay ghost + source dim**

In `RichTextEditor.module.scss`, extend the existing figure-margin reset to include the overlay (find the existing rule and add the third selector):

```scss
.root figure[data-attachment],
.shell figure[data-attachment],
.dragOverlay figure[data-attachment] {
  // stylelint-disable-next-line property-disallowed-list -- reset UA <figure> default margin; internal
  margin: 0;
}
```

Then append these two rules at the end of the file:

```scss
// The floating clone of the block being dragged, shown under the cursor by dnd-kit's
// <DragOverlay> (portaled to <body>). A "lifted card": surface bg + elevation +
// rounded corners + slight transparency so the block reads as picked up. Includes
// the prose mixin because block typography is scoped to `.root`, and the clone lives
// outside it. `pointer-events: none` keeps it from blocking the drop target under the
// cursor; `box-sizing: border-box` so the inline width (the source block's measured
// width, set in JS) includes padding. Width/position are the overlay's own anchoring
// (set inline by dnd-kit / JS), not in-flow component layout (cf. `.gutter`).
.dragOverlay {
  @include prose.prose;

  box-sizing: border-box;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  box-shadow: var(--shadow-lg);
  opacity: var(--opacity-muted);
  cursor: grabbing;
  pointer-events: none;
}

// The source block while its clone is being dragged — dimmed so the user sees it has
// been "lifted" out. Toggled as a transient class on the live block element during
// the drag (removed on drop/cancel).
.blockDragging {
  opacity: var(--opacity-dragging);
}
```

- [ ] **Step 6: Write the at-rest invariant test**

Add to `RichTextBlockControls.test.tsx` (the existing `Harness` renders the controls with `activeBlockId="b1"`, menu closed):

```tsx
it('renders no drag-overlay clone and no dimmed block at rest', () => {
  const { container } = render(<Harness />);
  // No drag in progress → DragOverlay renders null; the only [data-block-id] is the
  // single source <p> in the harness, never a second (cloned) copy.
  expect(container.querySelectorAll('[data-block-id="b1"]')).toHaveLength(1);
});
```

- [ ] **Step 7: Run lint + the test file**

Run: `make lint && npx vitest run packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`
Expected: stylelint clean; all tests PASS. (The at-rest test passes already — it pins the invariant before the overlay is wired in Task 2.)

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss \
        packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): block drag-preview snapshot helper + ghost/dim styles"
```

---

## Task 2: Wire the drag preview, source dim, menu-close, and drag reporting in `RichTextBlockControls`

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`

- [ ] **Step 1: Add the `onDraggingChange` prop to the interface**

In `RichTextBlockControls.tsx`, add to `RichTextBlockControlsProps` (after `onReorder`):

```tsx
  /**
   * Reports grip-drag lifecycle so the editor can suppress hover-driven active-block
   * changes while a drag is in progress (mirrors how `menuOpen` is mirrored into a
   * ref). Called `true` on drag start, `false` on drag end/cancel.
   */
  onDraggingChange?: (dragging: boolean) => void;
```

Add `onDraggingChange` to the destructured params in the function signature.

- [ ] **Step 2: Add the `DragOverlay` import + drag state/refs**

Add `DragOverlay` to the `@dnd-kit/core` import and `useRef` to the React import. Add a `DragStartEvent` type import from `@dnd-kit/core`.

Inside the component, alongside the existing `dropGap`/`dropY` state:

```tsx
// DOM snapshot ({ html, width }) of the block being dragged — drives the floating
// <DragOverlay> clone. null when not dragging.
const [dragSnapshot, setDragSnapshot] = useState<{ html: string; width: number } | null>(null);
// The live source element we dimmed, so the dim class can be removed on drop/cancel.
const draggedElRef = useRef<HTMLElement | null>(null);
```

- [ ] **Step 3: Add `handleDragStart` and clear-on-end logic**

Add a `handleDragStart` and a shared `endDrag` cleanup; call `endDrag` from both `handleDragEnd` and `handleDragCancel`:

```tsx
const handleDragStart = (_event: DragStartEvent) => {
  if (!activeBlockId) return;
  onMenuOpenChange(false); // a drag should never leave the block menu open (Notion-style)
  onDraggingChange?.(true);
  const snap = readBlockSnapshot(rootRef.current, activeBlockId);
  setDragSnapshot(snap);
  const el = rootRef.current?.querySelector<HTMLElement>(
    `[data-block-id="${CSS.escape(activeBlockId)}"]`,
  );
  if (el) {
    el.classList.add(styles.blockDragging);
    draggedElRef.current = el;
  }
};

// Shared teardown for both drop and cancel: undo the source dim, drop the snapshot,
// clear the drop indicator, and report drag end.
const endDrag = () => {
  draggedElRef.current?.classList.remove(styles.blockDragging);
  draggedElRef.current = null;
  setDragSnapshot(null);
  setDropGap(null);
  setDropY(null);
  onDraggingChange?.(false);
};
```

Update the existing `handleDragEnd` to compute the drop, fire `onReorder`, then `endDrag()` (replace its body's `setDropGap(null); setDropY(null);` with `endDrag()`):

```tsx
const handleDragEnd = (event: DragEndEvent) => {
  const drop = computeDrop(event);
  if (drop && activeBlockId) onReorder(activeBlockId, drop.gap);
  endDrag();
};

const handleDragCancel = () => {
  endDrag();
};
```

- [ ] **Step 4: Wire `onDragStart` on the `DndContext` and render the `DragOverlay`**

Add `onDragStart={handleDragStart}` to the `<DndContext>` props. Inside the `DndContext`, after the `dropIndicator` block, add:

```tsx
<DragOverlay>
  {dragSnapshot ? (
    <div
      className={styles.dragOverlay}
      style={{ width: dragSnapshot.width }}
      contentEditable={false}
      // The dragged block's OWN serialized DOM (already rendered in the live
      // doc), injected into an inert, non-editable, transient overlay that is
      // removed on drop. Not external/pasted HTML; no scripts run from an
      // innerHTML assignment. See the spec's "Snapshot safety".
      dangerouslySetInnerHTML={{ __html: dragSnapshot.html }}
    />
  ) : null}
</DragOverlay>
```

- [ ] **Step 5: Write the grip-click-opens-menu regression test**

Add to `RichTextBlockControls.test.tsx`:

```tsx
it('a plain grip click (no drag) opens the block menu', async () => {
  const onMenuOpenChange = vi.fn();
  render(<Harness onMenuOpenChange={onMenuOpenChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(onMenuOpenChange).toHaveBeenCalledWith(true);
});
```

- [ ] **Step 6: Run the test file + typecheck**

Run: `npx vitest run packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx && make build-lib`
Expected: all PASS; typecheck clean. (At-rest invariant from Task 1 still holds — `dragSnapshot` is null at rest, so the overlay renders nothing.)

> Note: the drag-triggered behaviors (ghost appears, source dims, menu closes on drag start) are not synthesizable in jsdom (same reason `Sortable` doesn't simulate drag). They are verified live in Task 4 via Playwright. The unit tests here pin the testable units: the snapshot helper, the at-rest invariant, and the click-not-drag menu path.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): floating block drag-preview + dim source + close menu on drag start"
```

---

## Task 3: Shell-level hover zone in `RichTextEditor` (the reachability fix)

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing hover-zone tests**

Add a nested block inside the existing `describe('blockControls', …)` in `RichTextEditor.test.tsx`. The existing `Controlled` component and `I18nProvider` wrapper are in scope; `fireEvent` must be imported from `@testing-library/react` (add to the existing import if missing).

```tsx
describe('hover zone', () => {
  // The shell is the editable's parent when blockControls is on (editable is a
  // direct child of .shell). mouseleave doesn't bubble, so we dispatch it on the shell.
  function shellOf(): HTMLElement {
    return screen.getByRole('textbox').parentElement as HTMLElement;
  }

  it('keeps the gutter when the pointer moves from the block onto the gutter', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await userEvent.hover(block);
    const actions = screen.getByRole('button', { name: 'Block actions' });
    // Moving onto a gutter button (resolves to no block id) must NOT clear the gutter.
    fireEvent.mouseOver(actions);
    expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
  });

  it('hides the gutter when the pointer leaves the editor (no caret)', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await userEvent.hover(block);
    expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
    fireEvent.mouseLeave(shellOf());
    expect(screen.queryByRole('button', { name: 'Block actions' })).toBeNull();
  });

  it('keeps a caret-driven gutter after the pointer leaves (caret fallback)', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    // Put a real caret inside the block, then notify the editor.
    const sel = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    fireEvent(document, new Event('selectionchange'));
    // Hover then leave: the gutter must remain, resolved from the caret block.
    await userEvent.hover(block);
    fireEvent.mouseLeave(shellOf());
    expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx -t "hover zone"`
Expected: FAIL — "hides the gutter when the pointer leaves" fails (no `mouseleave` handling today), and "caret fallback" fails (leave clears the single `activeBlockId` once `mouseleave` is added). ("keeps the gutter… onto the gutter" may already pass — that's fine, it pins the behavior.)

- [ ] **Step 3: Split the active-block state and add a dragging ref**

In `RichTextEditor.tsx`, replace the single state declaration (currently `const [activeBlockId, setActiveBlockId] = useState<string | null>(null);`) with:

```tsx
// Active block = hover wins, else the caret block (keyboard / after the mouse
// leaves). Split so clearing hover on editor-leave never wipes the caret target.
const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
const [caretBlockId, setCaretBlockId] = useState<string | null>(null);
const activeBlockId = hoverBlockId ?? caretBlockId;
```

Add a dragging ref next to `blockMenuOpenRef`:

```tsx
// Set by RichTextBlockControls' onDraggingChange. While a grip drag is in
// progress the active block must not change (it IS the block being dragged), so
// the hover handlers below read this ref and bail — mirroring blockMenuOpenRef.
const draggingRef = useRef(false);
```

- [ ] **Step 4: Replace the hover effect with shell-level tracking**

Replace the existing "Hover tracking (mouse)" effect with:

```tsx
// Hover tracking (mouse). Listens on the SHELL (which wraps both the editable and
// the gutter) so reaching from a block onto its controls keeps them alive:
// `mouseover` over the gutter resolves to no block id (it's outside the editable
// that blockIdFromNode stops at), so hoverBlockId is left unchanged. `mouseleave`
// on the shell fires only when the pointer truly leaves the editor → clear hover.
useEffect(() => {
  if (!controlsOn) return;
  const shell = shellRef.current;
  if (!shell) return;
  const onOver = (e: MouseEvent) => {
    // Don't let hover steal the active block while the menu is open (its actions
    // are bound to the active block) or while a drag is in progress.
    if (blockMenuOpenRef.current || draggingRef.current) return;
    const id = blockIdFromNode(e.target as Node);
    if (id) setHoverBlockId(id);
  };
  const onLeave = () => {
    // Keep the active block while the menu is open or a drag is mid-flight.
    if (blockMenuOpenRef.current || draggingRef.current) return;
    setHoverBlockId(null);
  };
  shell.addEventListener('mouseover', onOver);
  shell.addEventListener('mouseleave', onLeave);
  return () => {
    shell.removeEventListener('mouseover', onOver);
    shell.removeEventListener('mouseleave', onLeave);
  };
}, [controlsOn, blockIdFromNode]);
```

- [ ] **Step 5: Point the caret effect at `caretBlockId`**

In the "Caret tracking → active block" effect, change `if (id) setActiveBlockId(id);` to `if (id) setCaretBlockId(id);`.

- [ ] **Step 6: Update the Shift+F10 handler**

In the keydown handler, the `(e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu'` branch currently calls `setActiveBlockId(caretBlock)`. Replace with (so the menu binds to the caret block regardless of where the mouse happens to rest):

```tsx
setHoverBlockId(null);
setCaretBlockId(caretBlock);
setBlockMenuOpen(true);
```

- [ ] **Step 7: Wire `onDraggingChange` into the controls**

In the `blockControlsEl` JSX, add the prop (after `onConfigure`):

```tsx
        onDraggingChange={(d) => {
          draggingRef.current = d;
        }}
```

- [ ] **Step 8: Run the hover-zone tests + the existing blockControls suite**

Run: `npx vitest run packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: the three new hover-zone tests PASS, and all existing `blockControls` tests (hover reveals, ＋ insert, readOnly suppresses, menu-open-then-hover-other-block deletes the right block, Shift+F10 menu, move/duplicate) still PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): shell-level hover zone (gutter reachable; hides on exit; caret fallback)"
```

---

## Task 4: Demo note, full gates, and live Playwright verification

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`

- [ ] **Step 1: Add a one-line note to the "Block controls" demo description**

In `RichTextEditorDemo.tsx`, in the `<Example title="Block controls" …>` `description`, append a sentence so the new behavior is discoverable. Change the description to end with:

```
… or open the menu to turn into / duplicate / move / delete. Drag shows the whole block as a floating preview; the controls stay reachable as you move onto them.
```

(Edit only the `description` string of that one `Example` — no code/logic change.)

- [ ] **Step 2: Run the full gate set**

Run (from repo root):

```bash
make test && make build-lib && make lint && npm run format:check
```

Expected: all green. If `format:check` flags files, run `npx prettier --write` on them and re-run.

- [ ] **Step 3: Tarball hygiene check**

Run:

```bash
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: `0`.

- [ ] **Step 4: Live verification in the playground (Playwright)**

Start the playground (`make dev`, serves http://localhost:8080) and drive the RichTextEditor demo "Block controls" example. Confirm:

1. **Reachability:** hover a line → gutter (＋/⠿) appears; move the pointer left onto the gutter → controls stay (do not vanish); move the pointer out of the editor → gutter hides.
2. **Drag preview:** press-drag the ⠿ grip → a floating semi-transparent copy of the block follows the cursor, the source block dims, and the blue drop line shows the landing spot; release → block lands at the indicator and the ghost/dim clear.
3. **Menu vs drag:** click ⠿ to open the menu; then press-drag the grip → the menu closes as the drag starts. A plain click still opens the menu.

Capture before/after screenshots of (1) and (2) for the PR description. If any check fails, return to the relevant task.

- [ ] **Step 5: Commit the demo note**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "demo(RichTextEditor): note block drag-preview + reachable gutter"
```

---

## After all tasks

- [ ] **Rule 8 pre-push review-fix loop** (library changed): run gates, then spawn fresh-context `general-purpose` reviewer(s) briefed on the 10 categories (bugs, a11y, API, types, Rules 1–7, tests, tokens, SCSS, cross-package leakage, packaging) with special attention to: the `dangerouslySetInnerHTML` overlay (XSS reasoning), the direct DOM `classList` toggle cleanup (no leak on cancel), hover/caret resolution edge cases, and tokens-only SCSS. Fix every Critical/Important; re-run gates; re-review until "clean enough to stop".
- [ ] **Open the PR** off a branch `feat/rte-block-drag-hover` (base `main`), body referencing the spec + the three parts + before/after screenshots. Wait for `Quality / check` green, then squash-merge (auto-publishes a patch bump). No GitHub issue to close (raised conversationally).

---

## Self-Review (author)

**Spec coverage:**

- A — Hover zone → Task 3 (shell `mouseover`/`mouseleave`, `hoverBlockId ?? caretBlockId`, dragging/menu guards, caret fallback). ✓
- B — Drag preview → Tasks 1–2 (`readBlockSnapshot`, `.dragOverlay`/`.blockDragging`, `<DragOverlay>`, dim toggle, cleanup). ✓
- C — Menu vs drag → Task 2 (`onMenuOpenChange(false)` in `handleDragStart`; grip-click regression test). ✓
- Cross-component drag-state wiring (`onDraggingChange` → `draggingRef`) → Task 2 (prop) + Task 3 (wire/guard). ✓
- Tests (hover; snapshot; at-rest; grip-click) + Playwright live verification → Tasks 1–4. ✓
- Files / no-new-API / no-new-token → matches spec "Files". ✓

**Placeholder scan:** none — every code step has concrete code; every run step has a command + expected result.

**Type/name consistency:** `readBlockSnapshot(root, blockId) → { html, width } | null`, `dragSnapshot` state, `draggedElRef`, `onDraggingChange`, `draggingRef`, `hoverBlockId`/`caretBlockId`/`activeBlockId`, `styles.dragOverlay`/`styles.blockDragging` — used identically across tasks. `endDrag` is the single teardown for `handleDragEnd`/`handleDragCancel`. ✓
