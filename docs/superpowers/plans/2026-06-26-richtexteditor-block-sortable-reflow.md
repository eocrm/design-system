# RichTextEditor in-place sortable-reflow drag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the RichTextEditor block drag's floating-clone + blue-line visuals with an in-place sortable reflow — the grabbed row lifts and follows the pointer (clamped to the editor) while the other rows slide apart to open its slot — and make the whole gutter strip the full-row drag handle.

**Architecture:** Keep the existing `@dnd-kit/core` `DndContext`/`useDraggable` (no `SortableContext`). On drag, a pure helper (`blockReflow.computeReflow`) turns a measure-once start snapshot + the pointer delta into per-block `translateY` values + the drop gap; `RichTextBlockControls` applies those as transient inline transforms to the live block elements, lifts the dragged unit with an elevation style, and on drop clears the transforms and commits the existing subtree-aware `moveBlockUnitToIndex`. Zero changes to `renderDoc`, the model, or serialization.

**Tech Stack:** React + TypeScript, `@dnd-kit/core` (already a dep), CSS Modules + SCSS tokens, Vitest + Testing Library (jsdom), Playwright (live verification). Spec: `docs/superpowers/specs/2026-06-26-richtexteditor-block-sortable-reflow-design.md`.

---

## Context the engineer needs (read before starting)

- **Run tests via the workspace script** (the vitest config lives in the package; `npx vitest` from repo root fails with "it is not defined"):
  `cd /Users/dpws/projects/design-system && npm test -w @eocrm/design-system -- <path-under-packages/design-system>`
- **Gates:** `make test` · `make build-lib` (tsc) · `make lint` (stylelint) · `npm run format:check` — all from repo root.
- **Repo rules** (`packages/design-system/CLAUDE.md`): Rule 3 tokens-only SCSS for color/opacity/shadow/radius/spacing (stylelint-enforced; `transition`/`z-index`/`cursor`/`transform` are NOT in that enforced set); Rule 4 no layout props in component SCSS (but `position: relative` for an internal stacking context is allowed, and `transform`/inline geometry set by JS is the established overlay pattern, cf. `.gutter`/`.dropIndicator`); Rule 7 JSDoc on exported members; Rule 8 pre-push review loop; Rule 9 i18n (no new strings here).
- **What's being replaced (shipped in PR #217, v0.1.77):** `RichTextBlockControls.tsx` currently drags from the ⠿ grip only (`DraggableGrip`), shows a floating `<DragOverlay>` clone (`readBlockSnapshot` → `dragSnapshot`), dims the source (`.blockDragging`), and draws a blue `.dropIndicator` line (`dropGap`/`dropY`) at the gap from `computeDrop` + `gapIndexFromY`. ALL of that visual machinery is removed by this plan and replaced with the reflow.
- **Reorder contract (unchanged):** the editor wires `onReorder(id, gap)` → `moveBlockUnitToIndex(doc, id, gap)`. `gap` is a 0..N insertion index in the FULL current block array (the same value `gapIndexFromY(allRects, pointerY)` produces today). Keep this contract.
- **The dragged "unit":** `blockUnitRange` is subtree-aware (a list item carries its deeper descendants). In the DOM, `renderDoc` nests deeper list items INSIDE the parent `<li>`, so the unit's boxes = the active block's `[data-block-id]` element PLUS every `[data-block-id]` inside it — a contiguous run. We derive the unit from the DOM (no doc/model access needed in the controls).
- **`useDraggable` placement:** it must be called by a component rendered INSIDE the `DndContext`. Today `DraggableGrip` is that child. We replace it with a `DraggableGutter` child that wraps the whole gutter `<div>` (so the whole strip is the handle).
- **`blockRects` / `gapIndexFromY`:** `blockDrop.ts` exports `gapIndexFromY(rects, y)`. The new helper reuses it.

---

## File Structure

- **Create** `packages/design-system/src/components/RichTextEditor/blockReflow.ts` — pure `computeReflow` + types. (Task 1)
- **Create** `packages/design-system/src/components/RichTextEditor/blockReflow.test.ts` — helper unit tests. (Task 1)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx` — gutter as full-height `DraggableGutter` handle; snapshot+reflow drag; remove overlay/indicator/snapshot/`readBlockSnapshot`/`blockRects`/`computeDrop`. (Task 2)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss` — `.gutter` full-height + grab cursor; `.blockLifted`; `.reflowing [data-block-id]` transition; remove `.dragOverlay`/`.blockDragging`/`.dropIndicator`/`.gripDrag`. (Task 2)
- **Modify** `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx` — drop `readBlockSnapshot` tests; update at-rest test (no transform/lifted); keep gutter-click + menu tests. (Task 2)
- **Modify** `packages/playground/src/pages/components/RichTextEditorDemo.tsx` — "Block controls" demo note. (Task 3)

No editor (`RichTextEditor.tsx`) change is required: `RichTextBlockControls` already receives `rootRef` (the shell) + `activeBlockId` + `onReorder` + `onDraggingChange`, which is everything the reflow needs. No new public API, no manifest change.

---

## Task 1: `blockReflow.computeReflow` pure helper + tests

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/blockReflow.ts`
- Test: `packages/design-system/src/components/RichTextEditor/blockReflow.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `blockReflow.test.ts`:

```ts
import { computeReflow } from './blockReflow';

// 3 equal 20px-tall rows stacked from y=0.
const R3 = [
  { top: 0, height: 20 },
  { top: 20, height: 20 },
  { top: 40, height: 20 },
];

describe('computeReflow', () => {
  it('drag the first row down past the others → passed rows shift up, unit follows', () => {
    // pointer near the bottom row, dragged down by 40px; unit = row 0.
    const r = computeReflow(R3, { u0: 0, u1: 0 }, 40, 55);
    expect(r.gap).toBe(3); // lands at the end
    expect(r.liftDy).toBe(40); // clamped to maxDy = bottom(2)-bottom(0) = 60-20 = 40
    expect(r.shifts).toEqual([40, -20, -20]); // unit follows; rows 1,2 slide up by unitHeight(20)
  });

  it('drag the last row up to the top → passed rows shift down, unit follows', () => {
    const r = computeReflow(R3, { u0: 2, u1: 2 }, -40, 5);
    expect(r.gap).toBe(0);
    expect(r.liftDy).toBe(-40); // minDy = rects[0].top - rects[2].top = -40
    expect(r.shifts).toEqual([20, 20, -40]); // rows 0,1 slide down; unit follows up
  });

  it('clamps liftDy to the container bounds (cannot leave top/bottom)', () => {
    expect(computeReflow(R3, { u0: 0, u1: 0 }, 9999, 999).liftDy).toBe(40); // maxDy
    expect(computeReflow(R3, { u0: 2, u1: 2 }, -9999, -999).liftDy).toBe(-40); // minDy
  });

  it('no reorder when the pointer stays within the unit span (gap inside the unit)', () => {
    // unit = row 1; pointer over row 1's own box.
    const r = computeReflow(R3, { u0: 1, u1: 1 }, 0, 25);
    expect(r.gap).toBe(1); // a gap of u0 / inside the unit span → moveBlockUnitToIndex no-ops
    expect(r.shifts).toEqual([0, 0, 0]);
  });

  it('a multi-box unit (list subtree) travels together; neighbors shift by the full unit height', () => {
    // 4 rows; unit = rows 1..2 (a list item + one nested child), height 40.
    const R4 = [
      { top: 0, height: 20 },
      { top: 20, height: 20 },
      { top: 40, height: 20 },
      { top: 60, height: 20 },
    ];
    const r = computeReflow(R4, { u0: 1, u1: 2 }, 40, 75); // drag the pair down to the end
    expect(r.gap).toBe(4);
    expect(r.shifts[1]).toBe(r.liftDy);
    expect(r.shifts[2]).toBe(r.liftDy);
    expect(r.shifts[3]).toBe(-40); // the trailing row slides up by the unit's full height
    expect(r.shifts[0]).toBe(0);
  });

  it('returns a no-op reflow for an empty rect list', () => {
    expect(computeReflow([], { u0: 0, u1: 0 }, 10, 10)).toEqual({ liftDy: 0, gap: 0, shifts: [] });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -w @eocrm/design-system -- src/components/RichTextEditor/blockReflow.test.ts`
Expected: FAIL — `computeReflow` not found.

- [ ] **Step 3: Implement the helper**

Create `blockReflow.ts`:

```ts
// blockReflow.ts — pure geometry for the in-place sortable reflow of block drag.
// From a measure-once snapshot of the block boxes + the pointer, it computes how
// far the grabbed unit lifts (clamped to the container), where it will drop (the
// gap handed to moveBlockUnitToIndex), and the translateY each box needs so the
// neighbours slide apart to open the slot. No DOM access — unit-testable.
import { gapIndexFromY } from './blockDrop';

/** A block box's vertical geometry, relative to the editor shell. */
export interface BlockRect {
  top: number;
  height: number;
}

/** Inclusive box-index range of the dragged unit (a block + any nested subtree). */
export interface UnitRange {
  u0: number;
  u1: number;
}

export interface Reflow {
  /** translateY for the grabbed unit (pointer-following, clamped to the editor). */
  liftDy: number;
  /** Drop gap (0..N) in the full block array — fed to moveBlockUnitToIndex. */
  gap: number;
  /** translateY per box (same order as `rects`): the unit gets liftDy; neighbours
   *  between the unit and the drop gap shift by ±unitHeight; others 0. */
  shifts: number[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * @param rects    box geometry snapshot (untransformed), in document order
 * @param unit     inclusive box-index range of the grabbed unit
 * @param rawDy    pointer delta Y since drag start (drives the lift)
 * @param pointerY pointer Y relative to the shell (drives the drop gap)
 */
export function computeReflow(
  rects: BlockRect[],
  unit: UnitRange,
  rawDy: number,
  pointerY: number,
): Reflow {
  const n = rects.length;
  if (n === 0) return { liftDy: 0, gap: 0, shifts: [] };

  const bottom = (i: number) => rects[i].top + rects[i].height;
  const unitHeight = bottom(unit.u1) - rects[unit.u0].top;
  const minDy = rects[0].top - rects[unit.u0].top; // unit can rise until its top hits row 0's top
  const maxDy = bottom(n - 1) - bottom(unit.u1); // ...or fall until its bottom hits the last row's bottom
  const liftDy = clamp(rawDy, minDy, maxDy);
  const gap = gapIndexFromY(rects, pointerY);

  const shifts = rects.map((_, i) => {
    if (i >= unit.u0 && i <= unit.u1) return liftDy; // the lifted unit travels with the pointer
    if (gap <= unit.u0 && i >= gap && i < unit.u0) return unitHeight; // opening a slot ABOVE → push down
    if (gap >= unit.u1 + 1 && i > unit.u1 && i <= gap - 1) return -unitHeight; // slot BELOW → push up
    return 0;
  });

  return { liftDy, gap, shifts };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -w @eocrm/design-system -- src/components/RichTextEditor/blockReflow.test.ts`
Expected: PASS (all 6).

- [ ] **Step 5: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system
make build-lib
git add packages/design-system/src/components/RichTextEditor/blockReflow.ts \
        packages/design-system/src/components/RichTextEditor/blockReflow.test.ts
git commit -m "feat(RichTextEditor): pure computeReflow geometry for in-place block drag"
```

(Do NOT push. Never use --no-verify.)

---

## Task 2: Rewire `RichTextBlockControls` to the reflow drag + SCSS + tests

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx`

This is one cohesive change (the component, its styles, and its tests move together). Do the SCSS first so the class names exist, then the component, then the tests.

### Step 1: SCSS — replace the old drag visuals with reflow styles

In `RichTextEditor.module.scss`:

(a) **Remove** these rules entirely: `.dragOverlay`, `.blockDragging`, `.dropIndicator`, `.gripDrag`, `.gripDrag:active`, and the `.dragOverlay figure[data-attachment]` selector (revert the figure-margin reset to just `.root figure[data-attachment], .shell figure[data-attachment]`).

(b) **Modify `.gutter`** — it becomes a full-row-height drag handle. Change it to:

```scss
.gutter {
  position: absolute;
  inset-inline-start: var(--space-05);
  display: flex;
  gap: var(--space-05);
  align-items: center; // vertically centre the buttons within the full-row-height strip
  cursor: grab;
}

.gutter:active {
  cursor: grabbing;
}
```

(c) **Append** the reflow styles at the end of the file:

```scss
// In-place sortable reflow (block drag). `.reflowing` is toggled on the shell during
// a drag; block boxes get a transient inline translateY (set by JS) and slide via
// this transition to open the dragged row's slot. The lifted row itself follows the
// pointer 1:1, so it opts out of the transition.
.reflowing [data-block-id] {
  transition: transform 160ms ease;
}

// The grabbed row while dragging: raised above its neighbours with a card elevation
// so it reads as "lifted". `position: relative` is the stacking context for z-index
// (Rule 4 allows relative for an internal stacking/anchor purpose), not page layout.
.blockLifted {
  position: relative;
  z-index: 1;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  cursor: grabbing;
  transition: none; // track the pointer with no lag
}

@media (prefers-reduced-motion: reduce) {
  .reflowing [data-block-id] {
    transition: none;
  }
}
```

(Tokens-only: `--color-bg`, `--radius-md`, `--shadow-lg`, `--space-05` all exist. `transition`/`z-index`/`cursor`/`transform` are not strict-value-enforced; `z-index: 1` is an in-flow lift above sibling blocks, intentionally tiny. If stylelint flags `z-index`, the repo has no low-level z token for in-flow content — keep `1` with the comment.)

### Step 2: Rewrite the drag logic in `RichTextBlockControls.tsx`

Make these edits:

(a) **Imports** — drop `DragOverlay`; add the reflow helper. The dnd-kit import becomes:

```tsx
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
```

Replace the `import { gapIndexFromY } from './blockDrop';` line with:

```tsx
import { computeReflow, type BlockRect, type UnitRange } from './blockReflow';
```

(b) **Delete** the `blockRects` function (lines ~64–79) and the `readBlockSnapshot` function (lines ~81–96) entirely. Rename the draggable-id constant and drop `GUTTER_ROW_HEIGHT`:

```tsx
// Stable draggable id — there is only ever one active gutter handle at a time.
const GUTTER_DRAGGABLE_ID = 'rte-block-gutter';
```

(c) **Replace `DraggableGrip`** with a `DraggableGutter` that wraps the whole gutter strip (so the entire strip is the handle, and `useDraggable` runs inside the `DndContext`):

```tsx
/**
 * The gutter strip, wired as the dnd-kit drag handle (the WHOLE strip — ＋ / ⚙ / ⠿
 * and the space around them). A sub-4px press still reaches the buttons (insert /
 * configure / open menu); a press-drag past the 4px activation lifts the row.
 * Spreads only `listeners` — never dnd-kit's `attributes` — so the gutter stays out
 * of the tab order (keyboard reorder is the editor's ⌘/Ctrl+⇧↑/↓ shortcuts).
 */
function DraggableGutter({
  top,
  height,
  children,
}: {
  top: number;
  height: number | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, listeners } = useDraggable({ id: GUTTER_DRAGGABLE_ID });
  return (
    <div
      ref={setNodeRef}
      className={styles.gutter}
      style={{ top, height: height ?? undefined }}
      contentEditable={false}
      {...listeners}
    >
      {children}
    </div>
  );
}
```

(d) **State/refs.** In the component, replace the drop/overlay state block (the `dropGap`/`dropY`/`dragSnapshot`/`draggedElRef` declarations) with:

```tsx
const [top, setTop] = useState<number | null>(null);
const [height, setHeight] = useState<number | null>(null);
const [retry, setRetry] = useState(0);
// Drag snapshot, captured once at drag start (measuring transformed DOM would feed
// back on itself). null when not dragging.
const dragRef = useRef<{ rects: BlockRect[]; els: HTMLElement[]; unit: UnitRange } | null>(null);
// Latest drop gap from the most recent reflow, read on drag end.
const gapRef = useRef(0);
// Block id captured at drag start — reorder by this, not the live activeBlockId.
const draggedIdRef = useRef<string | null>(null);
```

(Keep the existing `draggedIdRef` if present — it already exists; just ensure `dragRef`/`gapRef` are added and `draggedElRef` is removed. `top`/`retry` already exist; add `height`.)

(e) **Unmount cleanup** — update it to clear reflow artifacts via the snapshot:

```tsx
const onDraggingChangeRef = useRef(onDraggingChange);
onDraggingChangeRef.current = onDraggingChange;

// If the controls unmount mid-drag (blockControls turned off, or the editor
// unmounts), dnd-kit fires neither end nor cancel — clear any applied transforms
// and report drag end so nothing leaks.
useEffect(() => {
  return () => {
    clearReflow(dragRef.current, rootRef.current);
    dragRef.current = null;
    onDraggingChangeRef.current?.(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Add this module-level helper (near `DraggableGutter`), so cleanup and `endDrag` share it:

```tsx
/** Strip all transient drag styles a reflow applied. */
function clearReflow(
  snap: { els: HTMLElement[]; unit: UnitRange } | null,
  shell: HTMLElement | null,
): void {
  if (snap) {
    for (const el of snap.els) el.style.transform = '';
    for (let i = snap.unit.u0; i <= snap.unit.u1; i += 1) {
      snap.els[i]?.classList.remove(styles.blockLifted);
    }
  }
  shell?.classList.remove(styles.reflowing);
}
```

(f) **Measurement effect** — set both `top` (block top, NOT centred) and `height`:

```tsx
useLayoutEffect(() => {
  if (!activeBlockId) {
    setTop(null);
    setHeight(null);
    setRetry(0);
    return;
  }
  const root = rootRef.current;
  const el = root?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(activeBlockId)}"]`);
  if (!root || !el) {
    setTop(null);
    setHeight(null);
    if (retry < 2) setRetry((n) => n + 1);
    return;
  }
  const rootBox = root.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  setTop(box.top - rootBox.top);
  setHeight(box.height);
}, [rootRef, activeBlockId, menuOpen, retry]);
```

(g) **Drag handlers** — replace `computeDrop` + `handleDragMove` + `handleDragStart` + `endDrag` + `handleDragEnd` + `handleDragCancel` with:

```tsx
const handleDragStart = (_event: DragStartEvent) => {
  const root = rootRef.current;
  if (!activeBlockId || !root) return;
  draggedIdRef.current = activeBlockId;
  onMenuOpenChange(false); // a drag should never leave the block menu open
  onDraggingChange?.(true);

  const shellTop = root.getBoundingClientRect().top;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-block-id]'));
  const rects: BlockRect[] = nodes.map((el) => {
    const b = el.getBoundingClientRect();
    return { top: b.top - shellTop, height: b.height };
  });
  // The dragged unit = the active block element PLUS its nested descendant blocks
  // (renderDoc nests deeper list items inside the parent <li>) — a contiguous run.
  const activeEl = nodes.find((el) => el.getAttribute('data-block-id') === activeBlockId);
  const unitIds = new Set<string>([activeBlockId]);
  activeEl?.querySelectorAll<HTMLElement>('[data-block-id]').forEach((d) => {
    const id = d.getAttribute('data-block-id');
    if (id) unitIds.add(id);
  });
  const idxs: number[] = [];
  nodes.forEach((el, i) => {
    const id = el.getAttribute('data-block-id');
    if (id && unitIds.has(id)) idxs.push(i);
  });
  if (idxs.length === 0) return;
  const unit: UnitRange = { u0: idxs[0], u1: idxs[idxs.length - 1] };

  dragRef.current = { rects, els: nodes, unit };
  root.classList.add(styles.reflowing);
  for (let i = unit.u0; i <= unit.u1; i += 1) nodes[i].classList.add(styles.blockLifted);
};

const handleDragMove = (event: DragMoveEvent) => {
  const snap = dragRef.current;
  const root = rootRef.current;
  if (!snap || !root) return;
  const activator = event.activatorEvent as PointerEvent;
  const initialY = typeof activator?.clientY === 'number' ? activator.clientY : null;
  if (initialY == null) return;
  const pointerY = initialY + event.delta.y - root.getBoundingClientRect().top;
  const reflow = computeReflow(snap.rects, snap.unit, event.delta.y, pointerY);
  gapRef.current = reflow.gap;
  for (let i = 0; i < snap.els.length; i += 1) {
    const dy = reflow.shifts[i];
    snap.els[i].style.transform = dy ? `translateY(${dy}px)` : '';
  }
};

const endDrag = () => {
  clearReflow(dragRef.current, rootRef.current);
  dragRef.current = null;
  draggedIdRef.current = null;
  gapRef.current = 0;
  onDraggingChange?.(false);
};

const handleDragEnd = (_event: DragEndEvent) => {
  const id = draggedIdRef.current;
  const gap = gapRef.current;
  endDrag(); // clear transforms BEFORE the reorder re-render so no inline styles linger
  if (id != null) onReorder(id, gap);
};

const handleDragCancel = () => {
  endDrag();
};
```

(h) **Render** — the early return keeps `top` (height may be null on first paint); render `DraggableGutter` instead of the old gutter `<div>`, and DELETE the `<DragOverlay>` and `.dropIndicator` JSX. The returned tree becomes:

```tsx
if (!activeBlockId || top == null) return null;

return (
  <DndContext
    sensors={sensors}
    onDragStart={handleDragStart}
    onDragMove={handleDragMove}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
  >
    <DraggableGutter top={top} height={height}>
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        tabIndex={-1}
        aria-label={t('richTextEditor.blockInsert')}
        className={styles.gutterButton}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onInsertBelow(activeBlockId)}
      >
        <PlusIcon />
      </Button>
      {onConfigure && (
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          tabIndex={-1}
          aria-label={t('richTextEditor.attachmentConfigure')}
          className={styles.gutterButton}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onConfigure(activeBlockId)}
        >
          <GearIcon />
        </Button>
      )}
      <RichTextBlockMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onAction={(a) => onAction(activeBlockId, a)}
        onTurnInto={(c) => onTurnInto(activeBlockId, c)}
        blockType={activeBlockType}
        onConfigure={onConfigure ? () => onConfigure(activeBlockId) : undefined}
      />
    </DraggableGutter>
  </DndContext>
);
```

(i) **Verify no dead references remain** — after the edits, grep the file for `dragSnapshot`, `dropGap`, `dropY`, `draggedElRef`, `DragOverlay`, `readBlockSnapshot`, `blockRects`, `dropIndicator`, `blockDragging`, `gripDrag`, `GUTTER_ROW_HEIGHT`, `gapIndexFromY`. There should be ZERO matches:

```bash
grep -nE "dragSnapshot|dropGap|dropY|draggedElRef|DragOverlay|readBlockSnapshot|blockRects|dropIndicator|blockDragging|gripDrag|GUTTER_ROW_HEIGHT|gapIndexFromY" packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx
```

### Step 3: Update the component tests

In `RichTextBlockControls.test.tsx`:

(a) **Remove** the `describe('readBlockSnapshot', …)` block and drop `readBlockSnapshot` from the import (`import { RichTextBlockControls } from './RichTextBlockControls';`).

(b) **Replace** the at-rest test (`renders no drag-overlay clone and no dimmed block at rest`) with a reflow at-rest invariant:

```tsx
it('applies no transform or lifted style at rest', () => {
  const { container } = render(<Harness />);
  const block = container.querySelector('[data-block-id="b1"]') as HTMLElement;
  expect(block.style.transform).toBe('');
  expect(block.className).not.toContain('blockLifted');
});
```

(c) **Keep** the existing `it('a plain grip click (no drag) opens the block menu', …)` test (the "Block actions" trigger still lives in the gutter and still opens on click) and all the insert/menu-action/turn-into/configure tests — they exercise the gutter buttons, which are unchanged. Confirm they still pass.

### Step 4: Run gates for this task

```bash
cd /Users/dpws/projects/design-system
npm test -w @eocrm/design-system -- src/components/RichTextEditor/RichTextBlockControls.test.tsx
make build-lib
make lint
```

Expected: all PASS; tsc + stylelint clean.

> Note: the live drag/reflow (real pointer, transforms, clamping, slide) is not drivable in jsdom — dnd-kit's PointerSensor needs real layout/pointer-capture (same limitation `Sortable` documents). It is verified in Task 3 via Playwright. The jsdom tests here pin the testable parts: the pure `computeReflow` (Task 1), the at-rest invariant, and the gutter buttons/menu still working.

### Step 5: Commit

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss \
        packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): in-place sortable reflow drag + full-gutter handle"
```

(Do NOT push. Never use --no-verify.)

---

## Task 3: Demo note, full gates, and live Playwright verification

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`

- [ ] **Step 1: Update the "Block controls" demo note**

In `RichTextEditorDemo.tsx`, the `<Example title="Block controls" …>` `description` currently ends with a sentence about the drag preview (added last PR). Replace that trailing sentence so it reads, after "…or open the menu to turn into / duplicate / move / delete.":

```
Grab anywhere on the gutter to drag the whole row — it lifts and the other rows slide apart to open its slot (clamped to the editor); text stays selectable.
```

(Edit only that one `description` string. The earlier "Dragging the handle shows the whole block as a floating preview…" wording is replaced.)

- [ ] **Step 2: Full gate set**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
```

Expected: all green. If `format:check` flags files, run `npx prettier --write` on them and re-run.

- [ ] **Step 3: Tarball hygiene**

```bash
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: `0`.

- [ ] **Step 4: Live verification (Playwright, playground)**

Use the running playground (`make dev` → http://localhost:8080/components/rich-text-editor; if port 8080 is busy a server is already up — reuse it). Drive editor #1 (the "Block controls" example, `withGutter`). Confirm:

1. **Full-gutter handle:** pressing-dragging anywhere on the gutter (not just ⠿) lifts the row; ＋ / ⚙ / ⠿ still respond to a plain click; selecting text by click-drag in the body still works.
2. **In-place reflow:** the grabbed row lifts (elevation) and follows the pointer; the other rows slide apart to open its slot; there is NO floating cursor-clone and NO blue line.
3. **Restricted to container:** dragging far up/down keeps the lifted row within the editor's block region (clamped).
4. **Drop correctness:** releasing lands the row in the opened slot (order matches); dragging a list item moves its nested subtree together; the dropped DOM has no residual inline `transform`.

Drive it with `browser_evaluate` (dispatch a PointerEvent sequence on the gutter: `pointerdown` on the gutter element, then `pointermove` on `document.body` past 4px — events on `window` won't reach dnd-kit's document listeners), asserting `[class*="blockLifted"]` appears during the drag and block order changes after `pointerup`. Capture a mid-drag screenshot (hold the drag: pointerdown + pointermove, no pointerup) for the PR; delete the artifact afterward.

- [ ] **Step 5: Commit the demo note**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "demo(RichTextEditor): note in-place reflow drag + full-gutter handle"
```

---

## After all tasks

- [ ] **Rule 8 pre-push review-fix loop** (library changed): run gates, then spawn fresh-context `general-purpose` reviewer(s) briefed on the 10 categories, with special attention to: the transient imperative DOM transforms on `contentEditable` children (cleanup on end/cancel/unmount; no residual inline styles after the reorder re-render), the measure-once correctness (no transformed-DOM feedback), the gap/`moveBlockUnitToIndex` parity with the prior behavior, the unit-from-DOM derivation for nested lists, tokens-only SCSS, and that the gutter buttons/menu still work with the whole strip draggable. Fix every Critical/Important; re-run gates; re-review until "clean enough to stop".
- [ ] **Open the PR** off a branch `feat/rte-block-reflow` (base `main`), body describing the three parts + before/after screenshots. Wait for `Quality / check` green, squash-merge (auto-publishes a patch bump). No GitHub issue (raised conversationally).

---

## Self-Review (author)

**Spec coverage:**

- In-place reorder (lift + neighbors part, no ghost/line) → Task 1 (`computeReflow`) + Task 2 (apply transforms, remove overlay/indicator). ✓
- Whole-gutter drag handle → Task 2 `DraggableGutter` + full-height `.gutter`. ✓
- Restricted to container → `computeReflow` `liftDy` clamp (minDy/maxDy). ✓
- Subtree units → unit-from-DOM derivation in `handleDragStart` + multi-box test. ✓
- Keep reorder commit / onDraggingChange / close-menu-on-drag / 4px clicks → preserved in Task 2. ✓
- Remove `<DragOverlay>`/`readBlockSnapshot`/`.dropIndicator`/`.blockDragging` → Task 2 + dead-ref grep. ✓
- Tests (pure helper, at-rest, gutter clicks) + Playwright → Tasks 1–3. ✓

**Placeholder scan:** none — every code step has concrete code; every run step has a command + expected result.

**Type/name consistency:** `computeReflow(rects, unit, rawDy, pointerY) → {liftDy, gap, shifts}`, `BlockRect`, `UnitRange {u0,u1}`, `Reflow`, `dragRef`/`gapRef`/`draggedIdRef`, `clearReflow(snap, shell)`, `DraggableGutter`, `GUTTER_DRAGGABLE_ID`, `styles.reflowing`/`styles.blockLifted` — used identically across Tasks 1–2. `onReorder(id, gap)` matches the unchanged editor contract. ✓
