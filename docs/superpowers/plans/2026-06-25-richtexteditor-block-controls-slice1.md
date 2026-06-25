# RichTextEditor Block Controls (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, keyboard-accessible Notion-style per-block control layer to `RichTextEditor` (gutter `＋`/`⠿`, block menu: turn into / duplicate / move / delete, subtree-aware reorder incl. drag).

**Architecture:** New **pure engine transforms** (`blockUnit.ts`) do all model mutation (unit = a block plus, for a list item, its deeper descendant run). A new **overlay gutter** (rendered outside the `contentEditable`, anchored to the active block's box) exposes `＋` and a `⠿` that is the trigger of one controlled `DropdownMenu`. The editor gains a `blockControls` prop, active-block tracking (hover + caret), keyboard shortcuts, and dnd-kit-core drag. Everything routes through the editor's existing `commit()` so each op is one undo step.

**Tech Stack:** React + TypeScript, the in-house RichText engine, `DropdownMenu`, `@dnd-kit/core` (allowed dep), SCSS modules + design tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-25-richtexteditor-block-controls-design.md`

---

## Conventions for every task

- Run tests from the repo root: `npm test -- <path>` (Vitest, `globals: true` — do **not** import `describe/it/expect/vi`).
- Engine files live in `packages/design-system/src/components/RichText/engine/`.
- Editor files live in `packages/design-system/src/components/RichTextEditor/`.
- Commit after each task with the message shown in its final step.
- Branch first (Task 0). All library code goes through a PR (root `CLAUDE.md` git workflow).

---

## File structure

**Create:**
- `…/RichText/engine/blockUnit.ts` — unit range + sibling helper + 5 transforms (pure).
- `…/RichText/engine/blockUnit.test.ts` — engine tests.
- `…/RichTextEditor/RichTextBlockMenu.tsx` — `DropdownMenu` wrapper (presentational).
- `…/RichTextEditor/RichTextBlockMenu.test.tsx`
- `…/RichTextEditor/RichTextBlockControls.tsx` — overlay gutter (`＋`, `⠿`+menu) + drag.
- `…/RichTextEditor/RichTextBlockControls.test.tsx`

**Modify:**
- `…/RichTextEditor/icons.tsx` — add `PlusIcon`, `GripIcon`, `DuplicateIcon`, `ArrowUpIcon`, `ArrowDownIcon`, `TrashIcon`.
- `…/RichTextEditor/RichTextEditor.tsx` — `blockControls` prop, active-block state, keyboard, render `<RichTextBlockControls>`.
- `…/RichTextEditor/RichTextEditor.module.scss` — gutter styles + left padding + relative anchor.
- `src/i18n/messages.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts` — new keys.
- `packages/design-system/AGENTS.md` — TL;DR for `blockControls`.
- `packages/playground/src/pages/components/RichTextEditorDemo.tsx` — a `blockControls` example.

No `src/index.ts` change (no new public component), no manifest change (no new component/cluster).

---

## Task 0: Branch

- [ ] **Step 1: Create the branch**

```bash
cd /Users/dpws/projects/design-system
git checkout main && git pull --ff-only
git checkout -b feat/rte-block-controls-slice1
```

- [ ] **Step 2: Verify hooks installed**

Run: `git config --get core.hooksPath`
Expected: `.husky/_`

---

## Task 1: Engine — `blockUnitRange` + `prevSiblingAnchor`

**Files:**
- Create: `packages/design-system/src/components/RichText/engine/blockUnit.ts`
- Test: `packages/design-system/src/components/RichText/engine/blockUnit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// blockUnit.test.ts
import { createBlock } from './model';
import { blockUnitRange, prevSiblingAnchor } from './blockUnit';
import type { Block } from './model';

const p = (id: string) => createBlock('paragraph', id, { id });
const li = (id: string, depth: number) => createBlock('bullet_item', id, { id, depth });

describe('blockUnitRange', () => {
  it('a non-list block is its own unit', () => {
    const blocks: Block[] = [p('a'), p('b')];
    expect(blockUnitRange(blocks, 0)).toEqual({ start: 0, end: 1 });
  });

  it('a list item carries its deeper descendant run', () => {
    // a(d0) > b(d1) > c(d2), then d(d0)
    const blocks = [li('a', 0), li('b', 1), li('c', 2), li('d', 0)];
    expect(blockUnitRange(blocks, 0)).toEqual({ start: 0, end: 3 }); // a + b + c
    expect(blockUnitRange(blocks, 1)).toEqual({ start: 1, end: 3 }); // b + c
    expect(blockUnitRange(blocks, 3)).toEqual({ start: 3, end: 4 }); // d alone
  });

  it('stops at a sibling of equal depth', () => {
    const blocks = [li('a', 0), li('b', 1), li('c', 0)];
    expect(blockUnitRange(blocks, 0)).toEqual({ start: 0, end: 2 });
  });

  it('stops at a non-list block', () => {
    const blocks = [li('a', 0), p('b')];
    expect(blockUnitRange(blocks, 0)).toEqual({ start: 0, end: 1 });
  });
});

describe('prevSiblingAnchor', () => {
  it('returns the previous top-level block for a paragraph', () => {
    const blocks = [p('a'), p('b')];
    expect(prevSiblingAnchor(blocks, 1)).toBe(0);
  });
  it('skips a previous sibling subtree to find the sibling anchor', () => {
    // a(d0) b(d1) c(d0): c's prev sibling is a (b is a's child)
    const blocks = [li('a', 0), li('b', 1), li('c', 0)];
    expect(prevSiblingAnchor(blocks, 2)).toBe(0);
  });
  it('returns -1 for a first child (no prev sibling at its depth)', () => {
    const blocks = [li('a', 0), li('b', 1)];
    expect(prevSiblingAnchor(blocks, 1)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: FAIL — `blockUnit` module not found.

- [ ] **Step 3: Implement**

```ts
// blockUnit.ts — Layer D. Block-"unit" helpers + structural transforms. A unit is
// a single block, except a list item, which carries its deeper descendant run
// (the contiguous following items at greater effective depth). Pure + immutable.
import type { RichDoc, Block, Range } from './model';
import { createBlock, nextId } from './model';
import { isListItem, effectiveDepths } from './listDepths';
import { findBlockIndex } from './position';

function collapsed(blockId: string, offset = 0): Range {
  return { anchor: { blockId, offset }, focus: { blockId, offset } };
}

/** Half-open index range `[start, end)` of the unit anchored at `index`. */
export function blockUnitRange(blocks: Block[], index: number): { start: number; end: number } {
  if (index < 0 || index >= blocks.length) return { start: index, end: index };
  if (!isListItem(blocks[index])) return { start: index, end: index + 1 };
  const eff = effectiveDepths(blocks);
  const d = eff[index];
  let end = index + 1;
  while (end < blocks.length && isListItem(blocks[end]) && eff[end] > d) end += 1;
  return { start: index, end };
}

/**
 * Index of the previous sibling's anchor (same effective depth, same list run),
 * or -1 when `index` is the first child / first block. Descendant blocks of an
 * earlier sibling (greater depth) are skipped.
 */
export function prevSiblingAnchor(blocks: Block[], index: number): number {
  const eff = effectiveDepths(blocks);
  const d = eff[index];
  for (let i = index - 1; i >= 0; i -= 1) {
    if (eff[i] < d) return -1; // hit an ancestor (or a depth-0 boundary for d>0)
    if (eff[i] === d && (d === 0 || isListItem(blocks[i]))) return i;
    // eff[i] > d → descendant of an earlier sibling: keep skipping
  }
  return -1;
}
```

(`collapsed`, `nextId`, `createBlock` are imported now so later tasks reuse them.)

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/blockUnit.ts packages/design-system/src/components/RichText/engine/blockUnit.test.ts
git commit -m "feat(RichText): blockUnitRange + prevSiblingAnchor unit helpers"
```

---

## Task 2: Engine — `moveBlockUnit` (sibling swap)

**Files:**
- Modify: `…/engine/blockUnit.ts`
- Test: `…/engine/blockUnit.test.ts`

- [ ] **Step 1: Add the failing test** (append to `blockUnit.test.ts`)

```ts
import { moveBlockUnit } from './blockUnit';
import type { RichDoc } from './model';

const doc = (blocks: Block[]): RichDoc => ({ blocks });
const ids = (d: RichDoc) => d.blocks.map((b) => b.id);

describe('moveBlockUnit', () => {
  it('moves a paragraph down past the next unit', () => {
    const d = doc([p('a'), p('b'), p('c')]);
    expect(ids(moveBlockUnit(d, 'a', 1).doc)).toEqual(['b', 'a', 'c']);
  });
  it('moves a paragraph up past the previous unit', () => {
    const d = doc([p('a'), p('b'), p('c')]);
    expect(ids(moveBlockUnit(d, 'c', -1).doc)).toEqual(['a', 'c', 'b']);
  });
  it('is a no-op at the top edge', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnit(d, 'a', -1).doc).toBe(d); // same reference → no commit
  });
  it('is a no-op at the bottom edge', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnit(d, 'b', 1).doc).toBe(d);
  });
  it('carries a list item subtree when swapping with a sibling subtree', () => {
    // a(d0) a1(d1) | b(d0) b1(d1) → move a down → b b1 a a1
    const d = doc([li('a', 0), li('a1', 1), li('b', 0), li('b1', 1)]);
    expect(ids(moveBlockUnit(d, 'a', 1).doc)).toEqual(['b', 'b1', 'a', 'a1']);
  });
  it('moves a nested item among its siblings only', () => {
    const d = doc([li('a', 0), li('x', 1), li('y', 1)]);
    expect(ids(moveBlockUnit(d, 'x', 1).doc)).toEqual(['a', 'y', 'x']);
  });
  it('caret lands on the moved anchor', () => {
    const d = doc([p('a'), p('b')]);
    expect(moveBlockUnit(d, 'a', 1).selection.anchor.blockId).toBe('a');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts -t moveBlockUnit`
Expected: FAIL — `moveBlockUnit` not exported.

- [ ] **Step 3: Implement** (append to `blockUnit.ts`)

```ts
/**
 * Swap the unit anchored at `blockId` with its adjacent SIBLING unit (`dir`: -1
 * up / +1 down). Same-depth swap, so depths are preserved. No-op (returns the
 * SAME doc reference) at an edge / when there is no sibling in that direction.
 */
export function moveBlockUnit(doc: RichDoc, blockId: string, dir: -1 | 1): { doc: RichDoc; selection: Range } {
  const blocks = doc.blocks;
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(blocks, idx);

  if (dir < 0) {
    const p = prevSiblingAnchor(blocks, idx);
    if (p === -1) return { doc, selection: collapsed(blockId) };
    const moving = blocks.slice(u.start, u.end);
    const before = blocks.slice(p, u.start);
    const next = [...blocks.slice(0, p), ...moving, ...before, ...blocks.slice(u.end)];
    return { doc: { blocks: next }, selection: collapsed(blockId) };
  }

  const eff = effectiveDepths(blocks);
  const d = eff[idx];
  // A next sibling exists only when the block at u.end sits at the SAME depth.
  if (u.end >= blocks.length || eff[u.end] !== d) return { doc, selection: collapsed(blockId) };
  const nextUnit = blockUnitRange(blocks, u.end);
  const moving = blocks.slice(u.start, u.end);
  const after = blocks.slice(u.end, nextUnit.end);
  const next = [...blocks.slice(0, u.start), ...after, ...moving, ...blocks.slice(nextUnit.end)];
  return { doc: { blocks: next }, selection: collapsed(blockId) };
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/blockUnit.ts packages/design-system/src/components/RichText/engine/blockUnit.test.ts
git commit -m "feat(RichText): moveBlockUnit subtree-aware sibling swap"
```

---

## Task 3: Engine — `duplicateBlockUnit`

**Files:** Modify `blockUnit.ts`; Test `blockUnit.test.ts`.

- [ ] **Step 1: Add the failing test**

```ts
import { duplicateBlockUnit } from './blockUnit';

describe('duplicateBlockUnit', () => {
  it('clones a paragraph right after itself with a fresh id', () => {
    const d = doc([p('a'), p('b')]);
    const r = duplicateBlockUnit(d, 'a');
    expect(r.doc.blocks.length).toBe(3);
    expect(r.doc.blocks[1].id).not.toBe('a');
    expect(r.doc.blocks.map((b) => b.id)[2]).toBe('b');
  });
  it('clones a list subtree with fresh ids and same depths', () => {
    const d = doc([li('a', 0), li('a1', 1), p('z')]);
    const r = duplicateBlockUnit(d, 'a');
    expect(r.doc.blocks.length).toBe(4); // a a1 a' a1' ... wait: a a1 [copy a, copy a1] z
    expect(r.doc.blocks.map((b) => b.type)).toEqual([
      'bullet_item', 'bullet_item', 'bullet_item', 'bullet_item', 'paragraph',
    ].slice(0, r.doc.blocks.length));
    expect(r.doc.blocks[2].depth).toBe(0);
    expect(r.doc.blocks[3].depth).toBe(1);
  });
  it('caret lands on the clone anchor', () => {
    const d = doc([p('a')]);
    const r = duplicateBlockUnit(d, 'a');
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[1].id);
  });
});
```

> Note: the second test's `.slice(...)` guard tolerates exact length; the key
> assertions are the fresh ids + preserved depths. Replace with the exact
> expected array `['bullet_item','bullet_item','bullet_item','bullet_item','paragraph']`
> once you confirm 5 blocks (a, a1, a-copy, a1-copy, z).

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts -t duplicateBlockUnit`
Expected: FAIL.

- [ ] **Step 3: Implement** (append to `blockUnit.ts`)

```ts
/** Deep-ish clone of a block with a fresh id (inlines are immutable, shared safely). */
function cloneBlock(b: Block): Block {
  return { ...b, id: nextId(), inlines: b.inlines.map((r) => ({ ...r, marks: r.marks.slice() })) };
}

/**
 * Duplicate the unit anchored at `blockId`, inserting the clones immediately
 * after the unit. Fresh ids; depths preserved. Caret lands on the clone's anchor.
 */
export function duplicateBlockUnit(doc: RichDoc, blockId: string): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const copies = doc.blocks.slice(u.start, u.end).map(cloneBlock);
  const blocks = [...doc.blocks.slice(0, u.end), ...copies, ...doc.blocks.slice(u.end)];
  return { doc: { blocks }, selection: collapsed(copies[0].id) };
}
```

- [ ] **Step 4: Run — verify pass** (fix the slice-guard test to the exact array now that you see 5 blocks)

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/design-system/src/components/RichText/engine/
git commit -m "feat(RichText): duplicateBlockUnit"
```

---

## Task 4: Engine — `removeBlockUnit`

**Files:** Modify `blockUnit.ts`; Test `blockUnit.test.ts`.

- [ ] **Step 1: Add the failing test**

```ts
import { removeBlockUnit } from './blockUnit';
import { emptyDoc } from './model';

describe('removeBlockUnit', () => {
  it('removes a paragraph; caret to the next block', () => {
    const d = doc([p('a'), p('b')]);
    const r = removeBlockUnit(d, 'a');
    expect(r.doc.blocks.map((x) => x.id)).toEqual(['b']);
    expect(r.selection.anchor.blockId).toBe('b');
  });
  it('removes a list subtree as a unit', () => {
    const d = doc([li('a', 0), li('a1', 1), p('z')]);
    const r = removeBlockUnit(d, 'a');
    expect(r.doc.blocks.map((x) => x.id)).toEqual(['z']);
  });
  it('removing the last block leaves one empty paragraph', () => {
    const d = doc([p('a')]);
    const r = removeBlockUnit(d, 'a');
    expect(r.doc.blocks.length).toBe(1);
    expect(r.doc.blocks[0].type).toBe('paragraph');
    expect(r.doc.blocks[0].id).not.toBe('a');
  });
  it('caret falls back to the previous block when removing the last unit', () => {
    const d = doc([p('a'), p('b')]);
    const r = removeBlockUnit(d, 'b');
    expect(r.selection.anchor.blockId).toBe('a');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts -t removeBlockUnit`
Expected: FAIL.

- [ ] **Step 3: Implement** (append to `blockUnit.ts`; add `emptyDoc` to the model import at top)

```ts
// at top: import { createBlock, nextId, emptyDoc } from './model';

/**
 * Remove the unit anchored at `blockId`. Empties to a single empty paragraph if
 * it was the whole document. Caret lands on the next surviving block, else the
 * previous, else the new empty paragraph.
 */
export function removeBlockUnit(doc: RichDoc, blockId: string): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const blocks = [...doc.blocks.slice(0, u.start), ...doc.blocks.slice(u.end)];
  if (blocks.length === 0) {
    const fresh = emptyDoc();
    return { doc: fresh, selection: collapsed(fresh.blocks[0].id) };
  }
  const caretIdx = Math.min(u.start, blocks.length - 1);
  return { doc: { blocks }, selection: collapsed(blocks[caretIdx].id) };
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/design-system/src/components/RichText/engine/
git commit -m "feat(RichText): removeBlockUnit (empties to one paragraph)"
```

---

## Task 5: Engine — `insertEmptyBlockBelow`

**Files:** Modify `blockUnit.ts`; Test `blockUnit.test.ts`.

- [ ] **Step 1: Add the failing test**

```ts
import { insertEmptyBlockBelow } from './blockUnit';

describe('insertEmptyBlockBelow', () => {
  it('inserts an empty paragraph after the block unit; caret in it', () => {
    const d = doc([p('a'), p('b')]);
    const r = insertEmptyBlockBelow(d, 'a');
    expect(r.doc.blocks.map((x) => x.id)[0]).toBe('a');
    expect(r.doc.blocks[1].type).toBe('paragraph');
    expect(r.doc.blocks[1].id).toBe(r.selection.anchor.blockId);
    expect(r.doc.blocks.map((x) => x.id)[2]).toBe('b');
  });
  it('inserts after a list subtree, not inside it', () => {
    const d = doc([li('a', 0), li('a1', 1)]);
    const r = insertEmptyBlockBelow(d, 'a');
    expect(r.doc.blocks.length).toBe(3);
    expect(r.doc.blocks[2].type).toBe('paragraph');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts -t insertEmptyBlockBelow`
Expected: FAIL.

- [ ] **Step 3: Implement** (append)

```ts
/** Insert an empty paragraph directly after the block unit anchored at `blockId`. */
export function insertEmptyBlockBelow(doc: RichDoc, blockId: string): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const fresh = createBlock('paragraph');
  const blocks = [...doc.blocks.slice(0, u.end), fresh, ...doc.blocks.slice(u.end)];
  return { doc: { blocks }, selection: collapsed(fresh.id) };
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/design-system/src/components/RichText/engine/
git commit -m "feat(RichText): insertEmptyBlockBelow"
```

---

## Task 6: Engine — `moveBlockUnitToIndex` (for drag)

**Files:** Modify `blockUnit.ts`; Test `blockUnit.test.ts`.

- [ ] **Step 1: Add the failing test**

```ts
import { moveBlockUnitToIndex } from './blockUnit';

describe('moveBlockUnitToIndex', () => {
  it('moves a paragraph to a later gap', () => {
    const d = doc([p('a'), p('b'), p('c')]);
    // move 'a' to the gap after index 2 (end)
    expect(ids(moveBlockUnitToIndex(d, 'a', 3).doc)).toEqual(['b', 'c', 'a']);
  });
  it('moves a paragraph to an earlier gap', () => {
    const d = doc([p('a'), p('b'), p('c')]);
    expect(ids(moveBlockUnitToIndex(d, 'c', 0).doc)).toEqual(['c', 'a', 'b']);
  });
  it('no-op when target is inside the moving unit', () => {
    const d = doc([li('a', 0), li('a1', 1), p('z')]);
    expect(moveBlockUnitToIndex(d, 'a', 1).doc).toBe(d);
  });
  it('clamps the dropped list item depth when it lands among non-list blocks', () => {
    const d = doc([li('a', 1), p('z')]); // a is raw depth 1
    const r = moveBlockUnitToIndex(d, 'a', 2); // drop after z (top level)
    const moved = r.doc.blocks.find((b) => b.id === 'a')!;
    expect(moved.depth).toBe(0); // clamped: no list item precedes
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts -t moveBlockUnitToIndex`
Expected: FAIL.

- [ ] **Step 3: Implement** (append)

```ts
/**
 * Move the unit anchored at `blockId` so its first block lands at array index
 * `target` (coordinates of the CURRENT array). The moved unit's top depth is
 * clamped to a value valid for its new predecessor (`prevListDepth + 1`, else 0);
 * descendants shift by the same delta. No-op when `target` falls inside the unit.
 */
export function moveBlockUnitToIndex(doc: RichDoc, blockId: string, target: number): { doc: RichDoc; selection: Range } {
  const blocks = doc.blocks;
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(blocks, idx);
  if (target > u.start && target < u.end) return { doc, selection: collapsed(blockId) };
  const moving = blocks.slice(u.start, u.end);
  const rest = [...blocks.slice(0, u.start), ...blocks.slice(u.end)];
  let insertAt = target > u.start ? target - moving.length : target;
  insertAt = Math.max(0, Math.min(insertAt, rest.length));

  let adjusted = moving;
  if (isListItem(moving[0])) {
    const prev = insertAt - 1;
    const prevDepth = prev >= 0 && isListItem(rest[prev]) ? (rest[prev].depth ?? 0) : -1;
    const maxDepth = prevDepth + 1;
    const topRaw = moving[0].depth ?? 0;
    const newTop = Math.max(0, Math.min(topRaw, maxDepth));
    const delta = newTop - topRaw;
    if (delta !== 0) {
      adjusted = moving.map((b) =>
        isListItem(b) ? { ...b, depth: Math.max(0, (b.depth ?? 0) + delta) } : b,
      );
    }
  }
  const next = [...rest.slice(0, insertAt), ...adjusted, ...rest.slice(insertAt)];
  return { doc: { blocks: next }, selection: collapsed(blockId) };
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichText/engine/blockUnit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/design-system/src/components/RichText/engine/
git commit -m "feat(RichText): moveBlockUnitToIndex with depth clamp (drag target)"
```

---

## Task 7: i18n keys

**Files:** Modify `src/i18n/messages.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts`.

The "Turn into" submenu reuses the EXISTING labels (`paragraph`, `heading1/2/3`, `blockquote`, `codeBlock`, `bulletList`, `orderedList`). Add only the new control/action labels.

- [ ] **Step 1: Add to `messages.ts`** — inside `richTextEditor: { … }` (after `mentionsEmpty`), before its closing `}`:

```ts
    /** aria-label on the block "insert below" (＋) gutter button. */
    blockInsert: string;
    /** aria-label on the block actions (⠿) gutter handle. */
    blockActions: string;
    /** "Turn into" submenu label in the block menu. */
    blockTurnInto: string;
    /** "Duplicate" item in the block menu. */
    blockDuplicate: string;
    /** "Move up" item in the block menu. */
    blockMoveUp: string;
    /** "Move down" item in the block menu. */
    blockMoveDown: string;
    /** "Delete" item in the block menu. */
    blockDelete: string;
```

- [ ] **Step 2: Add to `en.ts`** — inside `richTextEditor`, after `mentionsEmpty: 'No matches',`:

```ts
    blockInsert: 'Insert block below',
    blockActions: 'Block actions',
    blockTurnInto: 'Turn into',
    blockDuplicate: 'Duplicate',
    blockMoveUp: 'Move up',
    blockMoveDown: 'Move down',
    blockDelete: 'Delete',
```

- [ ] **Step 3: Add to `ru.ts`** — inside `richTextEditor`, after `mentionsEmpty: 'Нет совпадений',`:

```ts
    blockInsert: 'Вставить блок ниже',
    blockActions: 'Действия с блоком',
    blockTurnInto: 'Преобразовать в',
    blockDuplicate: 'Дублировать',
    blockMoveUp: 'Переместить вверх',
    blockMoveDown: 'Переместить вниз',
    blockDelete: 'Удалить',
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/design-system && npx tsc --noEmit` (or `npm run typecheck` from root)
Expected: PASS (the `Messages` interface and both locale objects agree).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/i18n/
git commit -m "feat(i18n): RichTextEditor block-control strings (en+ru)"
```

---

## Task 8: Icons

**Files:** Modify `…/RichTextEditor/icons.tsx`.

- [ ] **Step 1: Append six icons** (match the existing `base` props pattern)

```tsx
export function PlusIcon() {
  return (
    <svg {...base}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
export function GripIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function DuplicateIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
export function ArrowUpIcon() {
  return (
    <svg {...base}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}
export function ArrowDownIcon() {
  return (
    <svg {...base}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <path d="M5 12l7 7 7-7" />
    </svg>
  );
}
export function TrashIcon() {
  return (
    <svg {...base}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): block-control icons"
```

---

## Task 9: `RichTextBlockMenu` component

A presentational wrapper over `DropdownMenu` (controlled open) whose trigger is
the `⠿` handle. The "Turn into" submenu reuses existing block-type labels.

**Files:**
- Create: `…/RichTextEditor/RichTextBlockMenu.tsx`
- Test: `…/RichTextEditor/RichTextBlockMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// RichTextBlockMenu.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { RichTextBlockMenu } from './RichTextBlockMenu';

function setup(props: Partial<React.ComponentProps<typeof RichTextBlockMenu>> = {}) {
  const onAction = vi.fn();
  const onTurnInto = vi.fn();
  render(
    <I18nProvider>
      <RichTextBlockMenu
        open
        onOpenChange={() => {}}
        onAction={onAction}
        onTurnInto={onTurnInto}
        {...props}
      />
    </I18nProvider>,
  );
  return { onAction, onTurnInto };
}

it('renders the handle with the block-actions aria-label', () => {
  setup({ open: false });
  expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
});

it('fires onAction("duplicate") when Duplicate is chosen', async () => {
  const { onAction } = setup();
  await userEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));
  expect(onAction).toHaveBeenCalledWith('duplicate');
});

it('fires onAction("delete") for the Delete item', async () => {
  const { onAction } = setup();
  await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
  expect(onAction).toHaveBeenCalledWith('delete');
});

it('the handle is not a tab stop', () => {
  setup({ open: false });
  expect(screen.getByRole('button', { name: 'Block actions' })).toHaveAttribute('tabindex', '-1');
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichTextEditor/RichTextBlockMenu.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// RichTextBlockMenu.tsx — internal block actions menu (DropdownMenu wrapper). The
// `⠿` handle is the trigger; open is controlled by the editor so a keyboard
// Shift+F10 can open the SAME menu anchored to the active block's handle.
import { forwardRef } from 'react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { useTranslation } from '../../i18n';
import type { BlockChoice } from './RichTextToolbar';
import { GripIcon } from './icons';
import styles from './RichTextEditor.module.scss';

export type BlockAction = 'duplicate' | 'moveUp' | 'moveDown' | 'delete';

export interface RichTextBlockMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired for the flat actions (duplicate/move/delete). */
  onAction: (action: BlockAction) => void;
  /** Fired for a "Turn into" choice. */
  onTurnInto: (choice: BlockChoice) => void;
}

/** Internal: the `⠿` handle + its action menu. Trigger is `tabindex=-1`. */
export const RichTextBlockMenu = forwardRef<HTMLButtonElement, RichTextBlockMenuProps>(
  function RichTextBlockMenu({ open, onOpenChange, onAction, onTurnInto }, ref) {
    const t = useTranslation();
    return (
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenu.Trigger>
          <Button
            ref={ref}
            size="sm"
            variant="ghost"
            iconOnly
            tabIndex={-1}
            aria-label={t('richTextEditor.blockActions')}
            className={styles.gutterButton}
            // Keep the editor's DOM selection alive while opening.
            onMouseDown={(e) => e.preventDefault()}
          >
            <GripIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="bottom" align="start">
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('richTextEditor.blockTurnInto')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'paragraph' })}>
                {t('richTextEditor.paragraph')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 1 })}>
                {t('richTextEditor.heading1')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 2 })}>
                {t('richTextEditor.heading2')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'heading', level: 3 })}>
                {t('richTextEditor.heading3')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'bullet_item', depth: 0 })}>
                {t('richTextEditor.bulletList')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'ordered_item', depth: 0 })}>
                {t('richTextEditor.orderedList')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'blockquote' })}>
                {t('richTextEditor.blockquote')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onTurnInto({ type: 'code_block' })}>
                {t('richTextEditor.codeBlock')}
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />
          <DropdownMenu.Item shortcut="⌘D" onSelect={() => onAction('duplicate')}>
            {t('richTextEditor.blockDuplicate')}
          </DropdownMenu.Item>
          <DropdownMenu.Item shortcut="⌘⇧↑" onSelect={() => onAction('moveUp')}>
            {t('richTextEditor.blockMoveUp')}
          </DropdownMenu.Item>
          <DropdownMenu.Item shortcut="⌘⇧↓" onSelect={() => onAction('moveDown')}>
            {t('richTextEditor.blockMoveDown')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item tone="danger" onSelect={() => onAction('delete')}>
            {t('richTextEditor.blockDelete')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    );
  },
);
```

> If `DropdownMenu.Item` has no `shortcut` prop, drop those props (the labels still
> render). Verify against `DropdownMenu/Item.tsx` during implementation.

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichTextEditor/RichTextBlockMenu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockMenu.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockMenu.test.tsx
git commit -m "feat(RichTextEditor): RichTextBlockMenu (block actions DropdownMenu)"
```

---

## Task 10: `RichTextBlockControls` overlay (gutter + positioning + ＋ + menu)

Renders the gutter for the active block, positioned over the active block's box
inside the editor shell (which is `position: relative`). Owns the menu open state.

**Files:**
- Create: `…/RichTextEditor/RichTextBlockControls.tsx`
- Test: `…/RichTextEditor/RichTextBlockControls.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// RichTextBlockControls.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { I18nProvider } from '../../i18n';
import { RichTextBlockControls } from './RichTextBlockControls';

function Harness(props: Partial<React.ComponentProps<typeof RichTextBlockControls>>) {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <I18nProvider>
      <div ref={rootRef} style={{ position: 'relative' }}>
        <p data-block-id="b1">hello</p>
        <RichTextBlockControls
          rootRef={rootRef}
          activeBlockId="b1"
          menuOpen={false}
          onMenuOpenChange={() => {}}
          onInsertBelow={props.onInsertBelow ?? (() => {})}
          onAction={props.onAction ?? (() => {})}
          onTurnInto={props.onTurnInto ?? (() => {})}
          {...props}
        />
      </div>
    </I18nProvider>
  );
}

it('renders insert + actions buttons for the active block', () => {
  render(<Harness />);
  expect(screen.getByRole('button', { name: 'Insert block below' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
});

it('fires onInsertBelow with the active block id', async () => {
  const onInsertBelow = vi.fn();
  render(<Harness onInsertBelow={onInsertBelow} />);
  await userEvent.click(screen.getByRole('button', { name: 'Insert block below' }));
  expect(onInsertBelow).toHaveBeenCalledWith('b1');
});

it('renders nothing when activeBlockId is null', () => {
  const rootRef = { current: document.createElement('div') };
  render(
    <I18nProvider>
      <RichTextBlockControls
        rootRef={rootRef as React.RefObject<HTMLDivElement>}
        activeBlockId={null}
        menuOpen={false}
        onMenuOpenChange={() => {}}
        onInsertBelow={() => {}}
        onAction={() => {}}
        onTurnInto={() => {}}
      />
    </I18nProvider>,
  );
  expect(screen.queryByRole('button', { name: 'Insert block below' })).toBeNull();
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichTextEditor/RichTextBlockControls.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// RichTextBlockControls.tsx — the per-block gutter overlay. Absolutely positioned
// inside the editor shell (position: relative), aligned to the active block's box.
// Lives OUTSIDE the contentEditable so it is never editable content.
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import { RichTextBlockMenu, type BlockAction } from './RichTextBlockMenu';
import type { BlockChoice } from './RichTextToolbar';
import { PlusIcon } from './icons';
import styles from './RichTextEditor.module.scss';

export interface RichTextBlockControlsProps {
  rootRef: RefObject<HTMLElement | null>;
  /** Block currently hovered or holding the caret; null hides the gutter. */
  activeBlockId: string | null;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onInsertBelow: (blockId: string) => void;
  onAction: (blockId: string, action: BlockAction) => void;
  onTurnInto: (blockId: string, choice: BlockChoice) => void;
}

export function RichTextBlockControls({
  rootRef,
  activeBlockId,
  menuOpen,
  onMenuOpenChange,
  onInsertBelow,
  onAction,
  onTurnInto,
}: RichTextBlockControlsProps) {
  const t = useTranslation();
  const [top, setTop] = useState<number | null>(null);

  // Measure the active block's vertical offset within the shell after each render.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !activeBlockId) {
      setTop(null);
      return;
    }
    const el = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(activeBlockId)}"]`);
    if (!el) {
      setTop(null);
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setTop(box.top - rootBox.top + (box.height - 24) / 2); // 24 = gutter row height
  }, [rootRef, activeBlockId, menuOpen]);

  if (!activeBlockId || top == null) return null;

  return (
    <div className={styles.gutter} style={{ top }} contentEditable={false} aria-hidden={false}>
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
      <RichTextBlockMenu
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onAction={(a) => onAction(activeBlockId, a)}
        onTurnInto={(c) => onTurnInto(activeBlockId, c)}
      />
    </div>
  );
}
```

> The exact `top` math (and a horizontal offset) may need a small runtime nudge;
> the test only asserts presence/wiring (jsdom has no layout). Iterate visually in
> the playground (Task 14).

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichTextEditor/RichTextBlockControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): RichTextBlockControls gutter overlay"
```

---

## Task 11: Wire `blockControls` into `RichTextEditor`

Add the prop, active-block tracking (hover + caret), the keyboard shortcuts, and
render the gutter. All mutations go through `commit()`.

**Files:**
- Modify: `…/RichTextEditor/RichTextEditor.tsx`
- Test: `…/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write failing tests** (append to `RichTextEditor.test.tsx`)

```tsx
import { RichTextEditor } from './RichTextEditor';
import { docFromText } from '../RichText/engine/model';
// (render/screen/userEvent/I18nProvider already imported at top of the file — reuse them.)

function renderRTE(extra = {}) {
  function C() {
    const [doc, setDoc] = useState(docFromText('one\ntwo\nthree'));
    return <RichTextEditor value={doc} onChange={setDoc} blockControls {...extra} />;
  }
  return render(<I18nProvider><C /></I18nProvider>);
}

it('blockControls: gutter is absent by default', () => {
  function C() {
    const [doc, setDoc] = useState(docFromText('x'));
    return <RichTextEditor value={doc} onChange={setDoc} />;
  }
  render(<I18nProvider><C /></I18nProvider>);
  expect(screen.queryByRole('button', { name: 'Block actions' })).toBeNull();
});

it('blockControls: hovering a block reveals its gutter', async () => {
  renderRTE();
  const block = document.querySelector('[data-block-id]') as HTMLElement;
  await userEvent.hover(block);
  expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
});

it('blockControls: ＋ inserts an empty paragraph below', async () => {
  renderRTE();
  const block = document.querySelector('[data-block-id]') as HTMLElement;
  await userEvent.hover(block);
  const before = document.querySelectorAll('[data-block-id]').length;
  await userEvent.click(screen.getByRole('button', { name: 'Insert block below' }));
  expect(document.querySelectorAll('[data-block-id]').length).toBe(before + 1);
});

it('blockControls: readOnly suppresses the gutter', async () => {
  function C() {
    const [doc, setDoc] = useState(docFromText('x'));
    return <RichTextEditor value={doc} onChange={setDoc} blockControls readOnly />;
  }
  render(<I18nProvider><C /></I18nProvider>);
  const block = document.querySelector('[data-block-id]') as HTMLElement;
  await userEvent.hover(block);
  expect(screen.queryByRole('button', { name: 'Block actions' })).toBeNull();
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx -t blockControls`
Expected: FAIL.

- [ ] **Step 3: Implement** — edits to `RichTextEditor.tsx`:

3a. Add the prop to `RichTextEditorProps` (with JSDoc — see Task 13 for the final doc text; a short doc is fine now):

```ts
  /** Show Notion-style per-block controls (gutter ＋/⠿, block menu, reorder). Default false. Ignored when readOnly. */
  blockControls?: boolean;
```

3b. Destructure it in the component signature: add `blockControls = false,` next to `toolbar = false,`.

3c. Add imports at the top:

```ts
import {
  moveBlockUnit,
  duplicateBlockUnit,
  removeBlockUnit,
  insertEmptyBlockBelow,
} from '../RichText/engine/blockUnit';
import { runSetBlock, runToggleList } from './commands'; // runSetBlock/runToggleList already imported — ensure present
import { RichTextBlockControls } from './RichTextBlockControls';
import type { BlockAction } from './RichTextBlockMenu';
import type { BlockChoice } from './RichTextToolbar';
```

3d. Add state + handlers (inside the component, near the other state):

```ts
    const controlsOn = blockControls && !readOnly;
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [blockMenuOpen, setBlockMenuOpen] = useState(false);

    // Resolve the block element under a node to its data-block-id.
    const blockIdFromNode = useCallback((node: Node | null): string | null => {
      let el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
      while (el && el !== rootRef.current) {
        if (el.hasAttribute?.('data-block-id')) return el.getAttribute('data-block-id');
        el = el.parentElement;
      }
      return null;
    }, []);

    // Hover tracking (mouse).
    useEffect(() => {
      if (!controlsOn) return;
      const root = rootRef.current;
      if (!root) return;
      const onOver = (e: MouseEvent) => setActiveBlockId(blockIdFromNode(e.target as Node));
      root.addEventListener('mouseover', onOver);
      return () => root.removeEventListener('mouseover', onOver);
    }, [controlsOn, blockIdFromNode]);

    // Caret tracking → active block (so keyboard users get a gutter target).
    useEffect(() => {
      if (!controlsOn) return;
      const onSel = () => {
        const root = rootRef.current;
        const sel = root?.ownerDocument.getSelection();
        if (sel && root && sel.anchorNode && root.contains(sel.anchorNode)) {
          setActiveBlockId(blockIdFromNode(sel.anchorNode));
        }
      };
      document.addEventListener('selectionchange', onSel);
      return () => document.removeEventListener('selectionchange', onSel);
    }, [controlsOn, blockIdFromNode]);

    const onBlockInsertBelow = useCallback((id: string) => {
      commit(insertEmptyBlockBelow(latest.current.value, id), 'other');
    }, [commit]);

    const onBlockAction = useCallback((id: string, action: BlockAction) => {
      const v = latest.current.value;
      if (action === 'duplicate') commit(duplicateBlockUnit(v, id), 'other');
      else if (action === 'moveUp') commit(moveBlockUnit(v, id, -1), 'other');
      else if (action === 'moveDown') commit(moveBlockUnit(v, id, 1), 'other');
      else if (action === 'delete') commit(removeBlockUnit(v, id), 'other');
      setBlockMenuOpen(false);
    }, [commit]);

    const onBlockTurnInto = useCallback((id: string, choice: BlockChoice) => {
      const v = latest.current.value;
      const range = { anchor: { blockId: id, offset: 0 }, focus: { blockId: id, offset: 0 } };
      if (choice.type === 'bullet_item' || choice.type === 'ordered_item') {
        commit(runToggleList(v, range, choice.type), 'other');
      } else {
        commit(runSetBlock(v, range, choice), 'other');
      }
      setBlockMenuOpen(false);
    }, [commit]);
```

3e. In `onKeyDown`, add the keyboard shortcuts. Insert this block AFTER the
undo/redo handling but BEFORE the `readSelection` guard's later use — right after
`const range = readSelection(root); if (!range) return;` is fine, since these need
the caret's block:

```ts
        // Block controls keyboard: move/duplicate/menu for the caret's block.
        if (controlsOn) {
          const caretBlock = range.anchor.blockId;
          if (mod && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            commit(moveBlockUnit(value, caretBlock, e.key === 'ArrowUp' ? -1 : 1), 'other');
            return;
          }
          if (mod && !e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            commit(duplicateBlockUnit(value, caretBlock), 'other');
            return;
          }
          if (e.shiftKey && e.key === 'F10') {
            e.preventDefault();
            setActiveBlockId(caretBlock);
            setBlockMenuOpen(true);
            return;
          }
          if (e.key === 'ContextMenu') {
            e.preventDefault();
            setActiveBlockId(caretBlock);
            setBlockMenuOpen(true);
            return;
          }
        }
```

> Add `controlsOn`, `onBlock*` handlers, `moveBlockUnit`, `duplicateBlockUnit` to
> the `onKeyDown` `useCallback` dependency array.

3f. Render the gutter. In BOTH return branches (`if (!toolbar) return …` and the
toolbar `return`), add `{controlsOn && <RichTextBlockControls … />}` next to
`{linkBubble}`. Define the element once above the returns:

```tsx
    const blockControlsEl = controlsOn ? (
      <RichTextBlockControls
        rootRef={rootRef}
        activeBlockId={activeBlockId}
        menuOpen={blockMenuOpen}
        onMenuOpenChange={setBlockMenuOpen}
        onInsertBelow={onBlockInsertBelow}
        onAction={onBlockAction}
        onTurnInto={onBlockTurnInto}
      />
    ) : null;
```

Then add `{blockControlsEl}` after `{mentionMenu}` in both the fragment return and
the `styles.shell` return. **Important:** the non-toolbar branch currently returns
a fragment with no wrapper that is `position: relative`. Wrap it so the gutter can
anchor:

```tsx
    if (!toolbar) {
      return (
        <div className={styles.shell}>
          {editable}
          {linkBubble}
          {mentionMenu}
          {blockControlsEl}
        </div>
      );
    }
```

(The `styles.shell` already wraps the toolbar branch; reusing it here is fine and
gives the relative anchor. Confirm `shell` has no toolbar-specific assumptions; if
it does, add a dedicated `styles.root`-level relative wrapper class instead.)

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: PASS (all existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire blockControls (hover/caret tracking, menu, keyboard)"
```

---

## Task 12: SCSS — gutter styles

**Files:** Modify `…/RichTextEditor/RichTextEditor.module.scss`.

- [ ] **Step 1: Inspect current `shell`/`root`** to choose insertion points

Run: `sed -n '1,60p' packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
Expected: see `.shell`, `.root`, `.toolbar` rules.

- [ ] **Step 2: Add styles** (tokens only; `position: relative` on the shell is the allowed internal-anchor exception; left padding reserves gutter space — padding is permitted, margin is not)

```scss
.shell {
  position: relative; // anchor for the absolutely-positioned block gutter
}

.gutter {
  position: absolute;
  left: 0;
  display: flex;
  gap: var(--space-1);
  height: var(--space-6); // ~24px row; align with the measured offset in TS
  align-items: center;
  pointer-events: auto;
}

.gutterButton {
  color: var(--color-text-muted);
}

.root {
  // Reserve room for the gutter so controls don't overlap text.
  padding-left: var(--space-7);
}
```

> Verify the exact token names against `src/styles/tokens.scss` (`--space-6`,
> `--space-7`, `--color-text-muted`). Substitute the nearest existing tokens if a
> name differs — do NOT introduce raw values (stylelint blocks them).

- [ ] **Step 3: Lint**

Run: `npm run lint:css`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "style(RichTextEditor): block gutter styles"
```

---

## Task 13: JSDoc + `@remarks` for `blockControls`

**Files:** Modify `…/RichTextEditor/RichTextEditor.tsx`.

- [ ] **Step 1: Replace the short prop doc** with the full version:

```ts
  /**
   * Show Notion-style per-block controls: a left gutter that appears on the
   * hovered/focused block with an insert button (`＋`, adds an empty paragraph
   * below) and a drag handle (`⠿`) that reorders blocks and opens a block menu
   * (Turn into ▸, Duplicate, Move up/down, Delete). Reordering is subtree-aware
   * for nested lists. Keyboard: Shift+F10 / the ContextMenu key opens the focused
   * block's menu; ⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓ move the block; ⌘/Ctrl+D duplicates.
   * Default `false`. Ignored when `readOnly`. Independent of `toolbar`.
   */
  blockControls?: boolean;
```

- [ ] **Step 2: Add anti-patterns to the component's `@remarks`** — append to the existing Anti-patterns block:

```ts
 * - ❌ Building a custom block drag/menu by reaching into the DOM — pass
 *   `blockControls`; insert/move/duplicate/delete route through the controlled
 *   `value`/`onChange` round-trip and are undoable.
 * - ❌ Expecting Backspace to delete a whole block — it edits text; use the block
 *   menu's Delete (or select + delete) to remove a block.
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx
git commit -m "docs(RichTextEditor): JSDoc for blockControls prop"
```

---

## Task 14: Drag-to-reorder (dnd-kit core)

Add pointer-drag reorder using the `⠿` handle. Drop index is computed from block
geometry; the move is committed via `moveBlockUnitToIndex`.

**Files:**
- Modify: `…/RichTextEditor/RichTextBlockControls.tsx` (handle drag via `@dnd-kit/core`)
- Modify: `…/RichTextEditor/RichTextEditor.tsx` (pass an `onReorder(blockId, targetIndex)` callback)
- Test: `…/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Add an `onReorder` callback in the editor** that maps to `moveBlockUnitToIndex`:

```ts
    const onBlockReorder = useCallback((id: string, targetIndex: number) => {
      commit(moveBlockUnitToIndex(latest.current.value, id, targetIndex), 'other');
    }, [commit]);
```

Pass `onReorder={onBlockReorder}` to `<RichTextBlockControls>`; import
`moveBlockUnitToIndex` from `blockUnit`.

- [ ] **Step 2: Implement drag in `RichTextBlockControls`** using `@dnd-kit/core`'s
`DndContext` + `useDraggable` on the `⠿` handle, with a pointer sensor. On drag end,
compute the target gap index from the pointer's Y against every `[data-block-id]`
rect (the midpoint rule), then call `onReorder(activeBlockId, targetIndex)`. Render
a horizontal drop-indicator line at the candidate gap during drag.

```tsx
// sketch — wire concretely against @dnd-kit/core during implementation:
// const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
// On drag move: setDropIndex(computeGapIndex(root, event.activatorEvent.clientY + delta.y));
// On drag end: if (dropIndex != null) onReorder(activeBlockId, dropIndex);
// computeGapIndex: iterate root.querySelectorAll('[data-block-id]'); the gap is the
// first block whose vertical midpoint is below the pointer; default to blocks.length.
```

- [ ] **Step 3: Add a test** that exercises the geometry→index mapping by extracting
`computeGapIndex` as a pure exported helper and unit-testing it with stubbed rects:

```ts
// in a new file blockDrop.ts: export function gapIndexFromY(rects: {top:number;height:number}[], y: number): number
import { gapIndexFromY } from './blockDrop';
it('returns the gap before the first block whose midpoint is below y', () => {
  const rects = [{ top: 0, height: 20 }, { top: 20, height: 20 }, { top: 40, height: 20 }];
  expect(gapIndexFromY(rects, 5)).toBe(0);   // above block 0 midpoint (10)
  expect(gapIndexFromY(rects, 25)).toBe(1);  // below block 0 midpoint, above block 1 midpoint
  expect(gapIndexFromY(rects, 100)).toBe(3); // past everything → end
});
```

```ts
// blockDrop.ts
/** Index of the gap (0..n) where a drop at viewport-Y `y` should land. */
export function gapIndexFromY(rects: { top: number; height: number }[], y: number): number {
  for (let i = 0; i < rects.length; i += 1) {
    if (y < rects[i].top + rects[i].height / 2) return i;
  }
  return rects.length;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/components/RichTextEditor/blockDrop.test.ts`
Expected: PASS. Then verify the full editor suite still passes:
Run: `npm test -- src/components/RichTextEditor/`

- [ ] **Step 5: Manual verification in the playground** (jsdom can't test real drag):
Run `make dev`, open the RichTextEditor demo, drag a block by its `⠿` handle, confirm
reorder + nested-list subtree move + undo (⌘Z) restores.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/
git commit -m "feat(RichTextEditor): drag-to-reorder blocks (dnd-kit core)"
```

---

## Task 15: Playground demo

**Files:** Modify `packages/playground/src/pages/components/RichTextEditorDemo.tsx`.

- [ ] **Step 1: Add state** near the other `useState` calls:

```tsx
  const [blockDoc, setBlockDoc] = useState<RichDoc>(() =>
    fromMarkdown('# Block controls\n\nHover a line for the ＋/⠿ gutter.\n\n- first\n- second\n\n> Drag, duplicate, or turn into another type.'),
  );
```

- [ ] **Step 2: Add an `<Example>`** (place it after the toolbar example):

```tsx
      <Example
        title="Block controls"
        description="Set blockControls to show a per-block gutter on hover/focus: ＋ inserts a block, ⠿ drags to reorder and opens a menu (turn into / duplicate / move / delete). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑/↓ move, ⌘/Ctrl+D duplicates. Works with or without the toolbar."
        code={`const [doc, setDoc] = useState(fromMarkdown('…'));
<RichTextEditor value={doc} onChange={setDoc} blockControls />`}
      >
        <RichTextEditor value={blockDoc} onChange={setBlockDoc} blockControls placeholder="Write…" />
      </Example>
```

- [ ] **Step 3: Build the playground**

Run: `make build` (or `cd packages/playground && npm run build`)
Expected: typecheck + bundle PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "demo(RichTextEditor): blockControls example"
```

---

## Task 16: AGENTS.md TL;DR

**Files:** Modify `packages/design-system/AGENTS.md`.

- [ ] **Step 1: Find the RichTextEditor section**

Run: `grep -n "RichTextEditor" packages/design-system/AGENTS.md | head`

- [ ] **Step 2: Add a line/sub-bullet** to that section documenting `blockControls`:

```md
- `blockControls` (opt-in, default off): Notion-style per-block gutter — `＋`
  insert, `⠿` drag-to-reorder + a block menu (turn into / duplicate / move up·down
  / delete). Subtree-aware for nested lists. Keyboard: Shift+F10 opens the menu,
  ⌘/Ctrl+⇧↑·↓ move, ⌘/Ctrl+D duplicate. Independent of `toolbar`; ignored when
  `readOnly`. All ops route through `value`/`onChange` and are undoable.
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(AGENTS): RichTextEditor blockControls TL;DR"
```

---

## Task 17: Gates + pre-push review-fix loop (Rule 8)

- [ ] **Step 1: Run all gates from the repo root**

```bash
npm test
npm run typecheck
npm run lint:css
npm run build
npm pack --dry-run -w @eocrm/design-system
```

Expected: all PASS; `npm pack` shows **no** test files / internal-only paths in the tarball.

- [ ] **Step 2: Spawn a fresh-context review agent** targeted at
`packages/design-system/` per CLAUDE.md Rule 8 (10 categories; Critical/Important/
Nice-to-have/Regression-watch + verdict). Fix every Critical + Important; note any
deliberate skips.

- [ ] **Step 3: Re-run gates; re-review until verdict is "clean enough to stop."**

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin feat/rte-block-controls-slice1
gh pr create --fill --title "feat(RichTextEditor): Notion-style block controls (Slice 1)"
```

- [ ] **Step 5: Wait for `Quality / check` to pass, then merge.**

---

## Self-review (plan vs spec)

**Spec coverage:**
- `blockControls` opt-in prop → Task 11, 13. ✓
- Gutter `＋`/`⠿` → Tasks 8, 10. ✓
- Block menu (turn into / duplicate / move / delete) → Task 9. ✓
- Subtree-aware reorder (move + drag) → Tasks 1,2,6,14. ✓
- Engine transforms `blockUnitRange`/`moveBlockUnit`/`duplicateBlockUnit`/`removeBlockUnit` (+ `insertEmptyBlockBelow`, `moveBlockUnitToIndex`) → Tasks 1–6. ✓
- Keyboard model (Shift+F10 / ContextMenu, ⌘⇧↑/↓, ⌘D) → Task 11. ✓
- `tabindex=-1` handles → Tasks 9, 10 (+ test). ✓
- readOnly suppression → Task 11 (test). ✓
- i18n en+ru (reusing existing block-type labels) → Task 7. ✓
- JSDoc + @remarks → Task 13. ✓
- Tokens-only SCSS, no layout props (relative anchor + padding only) → Task 12. ✓
- Playground demo → Task 15. ✓
- AGENTS.md → Task 16. ✓
- Tests (engine + component) → every task. ✓
- DoD / review loop / pack check → Task 17. ✓

**Open verification points flagged for the implementer (not placeholders — known runtime-only unknowns):**
1. `DropdownMenu.Item` `shortcut` prop existence — Task 9 notes the fallback.
2. Exact token names in Task 12 — verify against `tokens.scss`.
3. Gutter `top`/`left` pixel math — Task 10/14 iterate in the playground (jsdom has no layout).
4. `styles.shell` reuse for the non-toolbar branch — Task 11 notes the fallback (dedicated relative wrapper) if `shell` carries toolbar assumptions.

**Type consistency:** `BlockAction` (RichTextBlockMenu) and `BlockChoice`
(RichTextToolbar) are reused verbatim across Tasks 9–11. Transform names match
across tasks and the editor wiring. ✓
```
