# RichText engine (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure document model + transform functions of an in-house WYSIWYG engine, plus a read-only `<RichText>` renderer that ships as a public `@eocrm/design-system` component.

**Architecture:** A flat document model (`RichDoc` = ordered `Block[]`; each block holds inline `runs` of text + a normalized mark set). Pure, immutable transform functions built bottom-up (marks → inlines → position → document transforms). A pure `renderDoc(model) → React` viewer, wrapped by the public `<RichText value={doc}>`. No editing/DOM/selection yet — that's later slices. No editor libraries (banned by dep policy).

**Tech Stack:** TypeScript, React, CSS Modules (SCSS + design tokens), Vitest + React Testing Library, `clsx`.

**Spec:** `docs/superpowers/specs/2026-06-18-richtext-engine-design.md`

---

## Conventions (read before starting)

- Library rules: `packages/design-system/CLAUDE.md`. Relevant here: four files per component dir (`RichText.tsx` + `RichText.test.tsx` + `RichText.module.scss` + `index.ts`), enforced by `src/structure.test.ts`; re-export from `src/index.ts` (Rule 5); `forwardRef` + spread HTML attrs (Rule 6); full JSDoc on every export (Rule 7); no raw values in SCSS (Rule 3); **no `margin`/`position`/`width`/`flex-grow` (Rule 4)** — prose spacing uses `gap`/`padding` tokens; i18n for user-facing strings (Rule 9 — none needed here).
- **Gate command locations** (learned, important): `npm test` / `npm run typecheck` run per-package (`-w @eocrm/design-system` or `cd packages/design-system`). **`npm run lint:css` and `npm run format:check` are ROOT scripts** — run from `/Users/dpws/projects/design-system`.
- Vitest has `globals: true` — do NOT import `describe`/`it`/`expect`/`vi`. For component tests import `render`, `screen` from `@testing-library/react`.
- Component dir: `packages/design-system/src/components/RichText/`. Engine modules live in its `engine/` subdir. Paths below are repo-root-relative.
- Branch: `feat/richtext-engine` (library change → PR required; no direct push to main for code).
- Run `npx prettier --write <files>` before each commit (the pre-push hook runs `format:check`).

---

## File structure

Created under `packages/design-system/src/components/RichText/`:

| File                   | Responsibility                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/model.ts`      | Types (`RichDoc`, `Block`, `Inline`, `Mark`, `Point`, `Range`, …) + constructors (`createBlock`, `emptyDoc`, `docFromText`, `nextId`). |
| `engine/marks.ts`      | Layer A — pure `Mark[]` helpers.                                                                                                       |
| `engine/inlines.ts`    | Layer B — pure `Inline[]` helpers.                                                                                                     |
| `engine/position.ts`   | Layer C — point/range helpers.                                                                                                         |
| `engine/transforms.ts` | Layer D — document transforms.                                                                                                         |
| `engine/renderDoc.tsx` | Pure `model → React` (list grouping + mark nesting).                                                                                   |
| `engine/*.test.ts(x)`  | Unit tests per engine module.                                                                                                          |
| `RichText.tsx`         | Public read-only renderer (`forwardRef`, JSDoc).                                                                                       |
| `RichText.module.scss` | Prose styles (tokens; `gap`/`padding`, no margin).                                                                                     |
| `RichText.test.tsx`    | Component tests.                                                                                                                       |
| `index.ts`             | Public exports (component + types + engine surface).                                                                                   |

Modified: `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`, `src/components.manifest.json`, `AGENTS.md`, and the four playground files.

---

## Task 1: Model types + constructors

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/model.ts`
- Test: `packages/design-system/src/components/RichText/engine/model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createBlock, emptyDoc, docFromText, nextId } from './model';

describe('model constructors', () => {
  it('createBlock makes an empty block with a single empty run + generated id', () => {
    const b = createBlock('paragraph');
    expect(b.type).toBe('paragraph');
    expect(b.inlines).toEqual([{ text: '', marks: [] }]);
    expect(typeof b.id).toBe('string');
    expect(b.id.length).toBeGreaterThan(0);
  });

  it('createBlock with text makes one run carrying the given marks', () => {
    const b = createBlock('paragraph', 'hi', { marks: [{ type: 'bold' }] });
    expect(b.inlines).toEqual([{ text: 'hi', marks: [{ type: 'bold' }] }]);
  });

  it('createBlock applies heading level + list depth attrs', () => {
    expect(createBlock('heading', 'H', { level: 2 }).level).toBe(2);
    expect(createBlock('bullet_item', 'x', { depth: 1 }).depth).toBe(1);
  });

  it('createBlock accepts an explicit id (for deterministic tests)', () => {
    expect(createBlock('paragraph', '', { id: 'fixed' }).id).toBe('fixed');
  });

  it('nextId returns distinct ids', () => {
    expect(nextId()).not.toBe(nextId());
  });

  it('emptyDoc is one empty paragraph', () => {
    const d = emptyDoc();
    expect(d.blocks).toHaveLength(1);
    expect(d.blocks[0].type).toBe('paragraph');
    expect(d.blocks[0].inlines).toEqual([{ text: '', marks: [] }]);
  });

  it('docFromText splits on newlines into paragraphs', () => {
    const d = docFromText('a\nb');
    expect(d.blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
    expect(d.blocks.map((b) => b.inlines[0].text)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/model.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
// model.ts — RichText document model types + constructors. Pure data; no DOM.

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet_item'
  | 'ordered_item'
  | 'blockquote'
  | 'code_block';

export type MarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link';

/** A formatting mark. Flags carry no data; `link` carries an href. */
export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; href: string };

/** A run of text sharing exactly one mark set. */
export interface Inline {
  text: string;
  marks: Mark[];
}

/** One line-level block. Lists are flat items addressed by `depth` (no tree). */
export interface Block {
  /** Stable id → React keys + position stability. */
  id: string;
  type: BlockType;
  /** Heading level, only for `type: 'heading'`. */
  level?: 1 | 2 | 3;
  /** List nesting depth (0-based), only for list items. */
  depth?: number;
  /** Inline content. An empty block holds a single empty run. */
  inlines: Inline[];
}

/** A rich-text document: an ordered list of blocks. */
export interface RichDoc {
  blocks: Block[];
}

/** A point in the document: a character offset within a block. */
export interface Point {
  blockId: string;
  /** 0..blockLength */
  offset: number;
}

/** A selection / span. `anchor` may come before or after `focus`. */
export interface Range {
  anchor: Point;
  focus: Point;
}

// Module-local monotonic id source. NOT Math.random/Date.now (unavailable in
// some contexts + non-deterministic). Unique within a session — enough for keys.
let idCounter = 0;
export function nextId(): string {
  idCounter += 1;
  return `rt${idCounter}`;
}

export interface CreateBlockAttrs {
  level?: 1 | 2 | 3;
  depth?: number;
  marks?: Mark[];
  /** Pin the id (tests / deterministic construction). */
  id?: string;
}

/** Build a block. Empty `text` → a single empty run. */
export function createBlock(type: BlockType, text = '', attrs: CreateBlockAttrs = {}): Block {
  const { level, depth, marks = [], id } = attrs;
  const inlines: Inline[] = text === '' ? [{ text: '', marks: [] }] : [{ text, marks }];
  const block: Block = { id: id ?? nextId(), type, inlines };
  if (level !== undefined) block.level = level;
  if (depth !== undefined) block.depth = depth;
  return block;
}

/** A document with one empty paragraph. */
export function emptyDoc(): RichDoc {
  return { blocks: [createBlock('paragraph')] };
}

/** Build a paragraph-per-line document from plain text (a demo/seed helper). */
export function docFromText(text: string): RichDoc {
  return { blocks: text.split('\n').map((line) => createBlock('paragraph', line)) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/model.ts packages/design-system/src/components/RichText/engine/model.test.ts
git commit -m "feat(RichText): document model types + constructors"
```

---

## Task 2: Layer A — mark helpers

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/marks.ts`
- Test: `packages/design-system/src/components/RichText/engine/marks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { marksEqual, hasMark, withMark, withoutMark, toggleMark } from './marks';
import type { Mark } from './model';

const bold: Mark = { type: 'bold' };
const italic: Mark = { type: 'italic' };

describe('marks', () => {
  it('marksEqual is order-insensitive', () => {
    expect(marksEqual([bold, italic], [italic, bold])).toBe(true);
    expect(marksEqual([bold], [bold, italic])).toBe(false);
    expect(marksEqual([], [])).toBe(true);
  });

  it('marksEqual distinguishes link href', () => {
    expect(marksEqual([{ type: 'link', href: '/a' }], [{ type: 'link', href: '/b' }])).toBe(false);
    expect(marksEqual([{ type: 'link', href: '/a' }], [{ type: 'link', href: '/a' }])).toBe(true);
  });

  it('hasMark checks by type', () => {
    expect(hasMark([bold], 'bold')).toBe(true);
    expect(hasMark([bold], 'italic')).toBe(false);
  });

  it('withMark adds, replacing a same-type mark (e.g. new link href)', () => {
    expect(withMark([], bold)).toEqual([bold]);
    expect(marksEqual(withMark([bold], italic), [bold, italic])).toBe(true);
    expect(withMark([{ type: 'link', href: '/a' }], { type: 'link', href: '/b' })).toEqual([
      { type: 'link', href: '/b' },
    ]);
  });

  it('withoutMark removes by type', () => {
    expect(withoutMark([bold, italic], 'bold')).toEqual([italic]);
    expect(withoutMark([bold], 'italic')).toEqual([bold]);
  });

  it('toggleMark adds if absent, removes if present', () => {
    expect(toggleMark([], bold)).toEqual([bold]);
    expect(toggleMark([bold], bold)).toEqual([]);
  });

  it('helpers do not mutate their input', () => {
    const input = [bold];
    withMark(input, italic);
    withoutMark(input, 'bold');
    toggleMark(input, bold);
    expect(input).toEqual([bold]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/marks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// marks.ts — Layer A. Pure helpers over a Mark[]. Never mutate inputs.
import type { Mark, MarkType } from './model';

/** Canonical key for set comparison (link distinguished by href). */
function markKey(m: Mark): string {
  return m.type === 'link' ? `link:${m.href}` : m.type;
}

/** Order-insensitive set equality (link href included). */
export function marksEqual(a: Mark[], b: Mark[]): boolean {
  if (a.length !== b.length) return false;
  const ka = a.map(markKey).sort();
  const kb = b.map(markKey).sort();
  return ka.every((k, i) => k === kb[i]);
}

export function hasMark(marks: Mark[], type: MarkType): boolean {
  return marks.some((m) => m.type === type);
}

/** Immutable add; replaces an existing mark of the same type (e.g. new link href). */
export function withMark(marks: Mark[], mark: Mark): Mark[] {
  return [...marks.filter((m) => m.type !== mark.type), mark];
}

export function withoutMark(marks: Mark[], type: MarkType): Mark[] {
  return marks.filter((m) => m.type !== type);
}

export function toggleMark(marks: Mark[], mark: Mark): Mark[] {
  return hasMark(marks, mark.type) ? withoutMark(marks, mark.type) : withMark(marks, mark);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/marks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/marks.ts packages/design-system/src/components/RichText/engine/marks.test.ts
git commit -m "feat(RichText): Layer A mark helpers"
```

---

## Task 3: Layer B — inline-run helpers

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/inlines.ts`
- Test: `packages/design-system/src/components/RichText/engine/inlines.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { runsText, runsLength, normalizeInlines, sliceInlines, mapMarksOverRange } from './inlines';
import { withMark } from './marks';
import type { Inline, Mark } from './model';

const bold: Mark = { type: 'bold' };
const plain = (text: string): Inline => ({ text, marks: [] });
const b = (text: string): Inline => ({ text, marks: [bold] });

describe('inlines', () => {
  it('runsText / runsLength concatenate', () => {
    expect(runsText([plain('ab'), b('cd')])).toBe('abcd');
    expect(runsLength([plain('ab'), b('cd')])).toBe(4);
  });

  it('normalizeInlines merges adjacent equal-mark runs and drops empties', () => {
    expect(normalizeInlines([plain('a'), plain(''), plain('b')])).toEqual([plain('ab')]);
    expect(normalizeInlines([plain('a'), b('b'), b('c')])).toEqual([plain('a'), b('bc')]);
  });

  it('normalizeInlines guarantees at least one (empty) run', () => {
    expect(normalizeInlines([])).toEqual([plain('')]);
    expect(normalizeInlines([plain('')])).toEqual([plain('')]);
  });

  it('sliceInlines extracts a char sub-range across run boundaries', () => {
    const runs = [plain('Hel'), b('lo')]; // "Hello"
    expect(sliceInlines(runs, 0, 5)).toEqual([plain('Hel'), b('lo')]);
    expect(sliceInlines(runs, 2, 4)).toEqual([plain('l'), b('l')]);
    expect(sliceInlines(runs, 3, 5)).toEqual([b('lo')]);
  });

  it('mapMarksOverRange applies fn only within [start,end), splitting runs', () => {
    const runs = [plain('abcd')];
    const out = mapMarksOverRange(runs, 1, 3, (m) => withMark(m, bold));
    // "a" plain, "bc" bold, "d" plain
    expect(out).toEqual([plain('a'), b('bc'), plain('d')]);
  });

  it('mapMarksOverRange leaves runs entirely outside the range untouched', () => {
    const runs = [plain('ab'), b('cd')];
    const out = mapMarksOverRange(runs, 0, 2, (m) => withMark(m, bold));
    expect(out).toEqual(
      [b('ab'), b('cd')].reduce<Inline[]>((acc, r) => {
        const last = acc[acc.length - 1];
        if (last && last.marks.length === r.marks.length) {
          acc[acc.length - 1] = { text: last.text + r.text, marks: last.marks };
          return acc;
        }
        acc.push(r);
        return acc;
      }, []),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/inlines.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// inlines.ts — Layer B. Pure helpers over an Inline[]. Never mutate inputs.
import type { Inline, Mark } from './model';
import { marksEqual } from './marks';

export function runsText(inlines: Inline[]): string {
  return inlines.map((r) => r.text).join('');
}

export function runsLength(inlines: Inline[]): number {
  return inlines.reduce((n, r) => n + r.text.length, 0);
}

/** Canonical form: adjacent equal-mark runs merged, empty runs dropped, ≥1 run. */
export function normalizeInlines(inlines: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const run of inlines) {
    if (run.text === '') continue;
    const last = out[out.length - 1];
    if (last && marksEqual(last.marks, run.marks)) {
      out[out.length - 1] = { text: last.text + run.text, marks: last.marks };
    } else {
      out.push({ text: run.text, marks: run.marks });
    }
  }
  return out.length === 0 ? [{ text: '', marks: [] }] : out;
}

/** Extract the character sub-range [start, end). Returns a normalized Inline[]. */
export function sliceInlines(inlines: Inline[], start: number, end: number): Inline[] {
  const out: Inline[] = [];
  let pos = 0;
  for (const run of inlines) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    const from = Math.max(start, runStart);
    const to = Math.min(end, runEnd);
    if (to > from) {
      out.push({ text: run.text.slice(from - runStart, to - runStart), marks: run.marks });
    }
  }
  return normalizeInlines(out);
}

/**
 * Apply `fn` to the mark set of every character in [start, end), splitting runs
 * at the boundaries. Characters outside the range keep their marks. Re-normalizes.
 */
export function mapMarksOverRange(
  inlines: Inline[],
  start: number,
  end: number,
  fn: (marks: Mark[]) => Mark[],
): Inline[] {
  const out: Inline[] = [];
  let pos = 0;
  for (const run of inlines) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    const from = Math.max(start, runStart);
    const to = Math.min(end, runEnd);
    if (to <= from) {
      out.push(run); // entirely outside the range
      continue;
    }
    if (from > runStart) out.push({ text: run.text.slice(0, from - runStart), marks: run.marks });
    out.push({ text: run.text.slice(from - runStart, to - runStart), marks: fn(run.marks) });
    if (to < runEnd) out.push({ text: run.text.slice(to - runStart), marks: run.marks });
  }
  return normalizeInlines(out);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/inlines.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/inlines.ts packages/design-system/src/components/RichText/engine/inlines.test.ts
git commit -m "feat(RichText): Layer B inline-run helpers"
```

---

## Task 4: Layer C — position helpers

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/position.ts`
- Test: `packages/design-system/src/components/RichText/engine/position.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  blockLength,
  findBlockIndex,
  clampPoint,
  comparePoints,
  isCollapsed,
  orderedRange,
} from './position';
import { createBlock } from './model';
import type { RichDoc } from './model';

const doc: RichDoc = {
  blocks: [
    createBlock('paragraph', 'hello', { id: 'a' }),
    createBlock('paragraph', 'world', { id: 'b' }),
  ],
};

describe('position', () => {
  it('blockLength = total run length', () => {
    expect(blockLength(doc.blocks[0])).toBe(5);
  });

  it('findBlockIndex returns index or -1', () => {
    expect(findBlockIndex(doc, 'b')).toBe(1);
    expect(findBlockIndex(doc, 'zzz')).toBe(-1);
  });

  it('clampPoint clamps offset into [0, blockLength]', () => {
    expect(clampPoint(doc, { blockId: 'a', offset: 99 })).toEqual({ blockId: 'a', offset: 5 });
    expect(clampPoint(doc, { blockId: 'a', offset: -3 })).toEqual({ blockId: 'a', offset: 0 });
  });

  it('comparePoints orders within and across blocks', () => {
    expect(comparePoints(doc, { blockId: 'a', offset: 1 }, { blockId: 'a', offset: 3 })).toBe(-1);
    expect(comparePoints(doc, { blockId: 'a', offset: 3 }, { blockId: 'a', offset: 3 })).toBe(0);
    expect(comparePoints(doc, { blockId: 'b', offset: 0 }, { blockId: 'a', offset: 9 })).toBe(1);
  });

  it('isCollapsed when anchor == focus', () => {
    expect(
      isCollapsed({ anchor: { blockId: 'a', offset: 2 }, focus: { blockId: 'a', offset: 2 } }),
    ).toBe(true);
    expect(
      isCollapsed({ anchor: { blockId: 'a', offset: 2 }, focus: { blockId: 'a', offset: 3 } }),
    ).toBe(false);
  });

  it('orderedRange returns start ≤ end regardless of anchor/focus order', () => {
    const r = { anchor: { blockId: 'b', offset: 1 }, focus: { blockId: 'a', offset: 1 } };
    expect(orderedRange(doc, r)).toEqual({
      start: { blockId: 'a', offset: 1 },
      end: { blockId: 'b', offset: 1 },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/position.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// position.ts — Layer C. Point/range helpers over a RichDoc.
import type { RichDoc, Block, Point, Range } from './model';
import { runsLength } from './inlines';

export function blockLength(block: Block): number {
  return runsLength(block.inlines);
}

export function findBlockIndex(doc: RichDoc, blockId: string): number {
  return doc.blocks.findIndex((b) => b.id === blockId);
}

export function clampPoint(doc: RichDoc, point: Point): Point {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return point;
  const len = blockLength(doc.blocks[idx]);
  return { blockId: point.blockId, offset: Math.max(0, Math.min(point.offset, len)) };
}

/** Document order: -1 if a before b, 1 if after, 0 if equal. */
export function comparePoints(doc: RichDoc, a: Point, b: Point): -1 | 0 | 1 {
  if (a.blockId === b.blockId) {
    return a.offset < b.offset ? -1 : a.offset > b.offset ? 1 : 0;
  }
  const ia = findBlockIndex(doc, a.blockId);
  const ib = findBlockIndex(doc, b.blockId);
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

export function isCollapsed(range: Range): boolean {
  return range.anchor.blockId === range.focus.blockId && range.anchor.offset === range.focus.offset;
}

/** Normalize a range so `start` ≤ `end` in document order. */
export function orderedRange(doc: RichDoc, range: Range): { start: Point; end: Point } {
  return comparePoints(doc, range.anchor, range.focus) <= 0
    ? { start: range.anchor, end: range.focus }
    : { start: range.focus, end: range.anchor };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/position.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/position.ts packages/design-system/src/components/RichText/engine/position.test.ts
git commit -m "feat(RichText): Layer C position helpers"
```

---

## Task 5: Layer D — document transforms

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/transforms.ts`
- Test: `packages/design-system/src/components/RichText/engine/transforms.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
} from './transforms';
import { createBlock } from './model';
import { runsText } from './inlines';
import type { RichDoc, Range } from './model';

const p = (text: string, id: string) => createBlock('paragraph', text, { id });
const doc = (...texts: [string, string][]): RichDoc => ({
  blocks: texts.map(([t, id]) => p(t, id)),
});
const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });

describe('transforms', () => {
  it('insertText inserts mid-run and moves the caret', () => {
    const r = insertText(doc(['ac', 'a']), at('a', 1), 'b');
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abc');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('insertText inherits the marks of the char before the caret', () => {
    const d: RichDoc = {
      blocks: [{ id: 'a', type: 'paragraph', inlines: [{ text: 'X', marks: [{ type: 'bold' }] }] }],
    };
    const r = insertText(d, at('a', 1), 'y');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'Xy', marks: [{ type: 'bold' }] }]);
  });

  it('deleteRange within a block removes the span', () => {
    const r = deleteRange(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)));
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ad');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteRange across blocks merges the partial first + last', () => {
    const r = deleteRange(doc(['hello', 'a'], ['world', 'b']), span(at('a', 2), at('b', 3)));
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('held');
  });

  it('deleteRange collapsed is a no-op', () => {
    const d = doc(['ab', 'a']);
    const r = deleteRange(d, span(at('a', 1), at('a', 1)));
    expect(r.doc).toBe(d);
  });

  it('splitBlock splits into two same-typed blocks', () => {
    const r = splitBlock(doc(['abcd', 'a']), at('a', 2));
    expect(r.doc.blocks.map((b) => runsText(b.inlines))).toEqual(['ab', 'cd']);
    expect(r.selection.focus.offset).toBe(0);
    expect(r.doc.blocks[1].type).toBe('paragraph');
  });

  it('mergeBlockBackward joins a block into the previous one', () => {
    const r = mergeBlockBackward(doc(['ab', 'a'], ['cd', 'b']), 'b');
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('mergeBlockBackward on the first block is a no-op', () => {
    const d = doc(['ab', 'a']);
    expect(mergeBlockBackward(d, 'a').doc).toBe(d);
  });

  it('applyMark splits runs and marks the range', () => {
    const r = applyMark(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)), { type: 'bold' });
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'a', marks: [] },
      { text: 'bc', marks: [{ type: 'bold' }] },
      { text: 'd', marks: [] },
    ]);
  });

  it('toggleMark removes when the whole range already has the mark, else adds', () => {
    const bolded = applyMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 4)), {
      type: 'bold',
    }).doc;
    const r = toggleMark(bolded, span(at('a', 0), at('a', 4)), { type: 'bold' });
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [] }]);
    const r2 = toggleMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 2)), { type: 'bold' });
    expect(r2.doc.blocks[0].inlines[0]).toEqual({ text: 'ab', marks: [{ type: 'bold' }] });
  });

  it('removeMark clears a mark over the range', () => {
    const bolded = applyMark(doc(['abcd', 'a']), span(at('a', 0), at('a', 4)), {
      type: 'bold',
    }).doc;
    const r = removeMark(bolded, span(at('a', 1), at('a', 3)), 'bold');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'a', marks: [{ type: 'bold' }] },
      { text: 'bc', marks: [] },
      { text: 'd', marks: [{ type: 'bold' }] },
    ]);
  });

  it('setBlockType changes type + attrs, preserving content and dropping irrelevant attrs', () => {
    const r = setBlockType(doc(['title', 'a']), 'a', { type: 'heading', level: 2 });
    expect(r.doc.blocks[0].type).toBe('heading');
    expect(r.doc.blocks[0].level).toBe(2);
    const back = setBlockType(r.doc, 'a', { type: 'paragraph' });
    expect(back.doc.blocks[0].level).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/transforms.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// transforms.ts — Layer D. Document transforms. Pure + immutable; each returns
// { doc, selection } (the new doc + where the caret/selection should land).
import type { RichDoc, Block, Point, Range, Mark, MarkType } from './model';
import { createBlock } from './model';
import { normalizeInlines, sliceInlines, mapMarksOverRange } from './inlines';
import { withMark, withoutMark, hasMark } from './marks';
import { blockLength, findBlockIndex, orderedRange } from './position';

function collapsed(point: Point): Range {
  return { anchor: point, focus: point };
}

function replaceBlock(doc: RichDoc, index: number, block: Block): RichDoc {
  const blocks = doc.blocks.slice();
  blocks[index] = block;
  return { blocks };
}

/** Marks of the character immediately before `offset` (inherited on insert). */
function marksBefore(block: Block, offset: number): Mark[] {
  if (offset <= 0) return [];
  let pos = 0;
  for (const run of block.inlines) {
    const runEnd = pos + run.text.length;
    if (offset - 1 >= pos && offset - 1 < runEnd) return run.marks;
    pos = runEnd;
  }
  return [];
}

export function insertText(
  doc: RichDoc,
  point: Point,
  text: string,
): { doc: RichDoc; selection: Range } {
  if (text === '') return { doc, selection: collapsed(point) };
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point) };
  const block = doc.blocks[idx];
  const inlines = normalizeInlines([
    ...sliceInlines(block.inlines, 0, point.offset),
    { text, marks: marksBefore(block, point.offset) },
    ...sliceInlines(block.inlines, point.offset, blockLength(block)),
  ]);
  return {
    doc: replaceBlock(doc, idx, { ...block, inlines }),
    selection: collapsed({ blockId: block.id, offset: point.offset + text.length }),
  };
}

export function deleteRange(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range } {
  const { start, end } = orderedRange(doc, range);
  if (start.blockId === end.blockId && start.offset === end.offset) {
    return { doc, selection: collapsed(start) };
  }
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return { doc, selection: collapsed(start) };
  const startBlock = doc.blocks[si];
  const endBlock = doc.blocks[ei];
  const inlines = normalizeInlines([
    ...sliceInlines(startBlock.inlines, 0, start.offset),
    ...sliceInlines(endBlock.inlines, end.offset, blockLength(endBlock)),
  ]);
  const blocks = doc.blocks.slice();
  blocks.splice(si, ei - si + 1, { ...startBlock, inlines });
  return {
    doc: { blocks },
    selection: collapsed({ blockId: startBlock.id, offset: start.offset }),
  };
}

export function splitBlock(doc: RichDoc, point: Point): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point) };
  const block = doc.blocks[idx];
  const left: Block = {
    ...block,
    inlines: normalizeInlines(sliceInlines(block.inlines, 0, point.offset)),
  };
  const rightInlines = normalizeInlines(
    sliceInlines(block.inlines, point.offset, blockLength(block)),
  );
  const right: Block = {
    ...createBlock(block.type, '', { level: block.level, depth: block.depth }),
    inlines: rightInlines,
  };
  const blocks = doc.blocks.slice();
  blocks.splice(idx, 1, left, right);
  return { doc: { blocks }, selection: collapsed({ blockId: right.id, offset: 0 }) };
}

export function mergeBlockBackward(
  doc: RichDoc,
  blockId: string,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx <= 0) return { doc, selection: collapsed({ blockId, offset: 0 }) };
  const prev = doc.blocks[idx - 1];
  const cur = doc.blocks[idx];
  const joinOffset = blockLength(prev);
  const inlines = normalizeInlines([...prev.inlines, ...cur.inlines]);
  const blocks = doc.blocks.slice();
  blocks.splice(idx - 1, 2, { ...prev, inlines });
  return { doc: { blocks }, selection: collapsed({ blockId: prev.id, offset: joinOffset }) };
}

function transformMarksOverRange(
  doc: RichDoc,
  range: Range,
  fn: (marks: Mark[]) => Mark[],
): { doc: RichDoc; selection: Range } {
  const { start, end } = orderedRange(doc, range);
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return { doc, selection: range };
  const blocks = doc.blocks.slice();
  for (let i = si; i <= ei; i += 1) {
    const block = blocks[i];
    const from = i === si ? start.offset : 0;
    const to = i === ei ? end.offset : blockLength(block);
    if (to <= from) continue;
    blocks[i] = { ...block, inlines: mapMarksOverRange(block.inlines, from, to, fn) };
  }
  return { doc: { blocks }, selection: range };
}

export function applyMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return transformMarksOverRange(doc, range, (m) => withMark(m, mark));
}

export function removeMark(
  doc: RichDoc,
  range: Range,
  type: MarkType,
): { doc: RichDoc; selection: Range } {
  return transformMarksOverRange(doc, range, (m) => withoutMark(m, type));
}

/** True iff every character in the (non-empty) range carries `type`. */
function rangeHasMarkEverywhere(doc: RichDoc, range: Range, type: MarkType): boolean {
  const { start, end } = orderedRange(doc, range);
  if (start.blockId === end.blockId && start.offset === end.offset) return false;
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return false;
  for (let i = si; i <= ei; i += 1) {
    const block = doc.blocks[i];
    const from = i === si ? start.offset : 0;
    const to = i === ei ? end.offset : blockLength(block);
    if (to <= from) continue;
    let pos = 0;
    for (const run of block.inlines) {
      const rs = pos;
      const re = pos + run.text.length;
      pos = re;
      const f = Math.max(from, rs);
      const t = Math.min(to, re);
      if (t > f && !hasMark(run.marks, type)) return false;
    }
  }
  return true;
}

export function toggleMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return rangeHasMarkEverywhere(doc, range, mark.type)
    ? removeMark(doc, range, mark.type)
    : applyMark(doc, range, mark);
}

export function setBlockType(
  doc: RichDoc,
  blockId: string,
  patch: Partial<Pick<Block, 'type' | 'level' | 'depth'>>,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed({ blockId, offset: 0 }) };
  const next: Block = { ...doc.blocks[idx], ...patch };
  if (next.type !== 'heading') delete next.level;
  if (next.type !== 'bullet_item' && next.type !== 'ordered_item') delete next.depth;
  return { doc: replaceBlock(doc, idx, next), selection: collapsed({ blockId, offset: 0 }) };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/transforms.ts packages/design-system/src/components/RichText/engine/transforms.test.ts
git commit -m "feat(RichText): Layer D document transforms"
```

---

## Task 6: Read-only render (model → React)

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/renderDoc.tsx`
- Test: `packages/design-system/src/components/RichText/engine/renderDoc.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';
import { renderDoc } from './renderDoc';
import { createBlock } from './model';
import type { RichDoc } from './model';

function html(doc: RichDoc): string {
  const { container } = render(<>{renderDoc(doc)}</>);
  return container.innerHTML;
}

describe('renderDoc', () => {
  it('renders block types to semantic elements', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: '1' }),
        createBlock('paragraph', 'P', { id: '2' }),
        createBlock('blockquote', 'Q', { id: '3' }),
        createBlock('code_block', 'C', { id: '4' }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('<h2>H</h2>');
    expect(out).toContain('<p>P</p>');
    expect(out).toContain('<blockquote>Q</blockquote>');
    expect(out).toContain('<pre><code>C</code></pre>');
  });

  it('nests inline marks deterministically (link outermost, code innermost)', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] }],
        },
      ],
    };
    expect(html(doc)).toContain('<strong><em>x</em></strong>');
  });

  it('renders a link with href', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: '1',
          type: 'paragraph',
          inlines: [{ text: 'go', marks: [{ type: 'link', href: '/docs' }] }],
        },
      ],
    };
    expect(html(doc)).toContain('<a href="/docs">go</a>');
  });

  it('groups consecutive bullet items into one <ul>', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'one', { id: '1' }),
        createBlock('bullet_item', 'two', { id: '2' }),
        createBlock('paragraph', 'after', { id: '3' }),
      ],
    };
    const out = html(doc);
    expect(out).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(out).toContain('<p>after</p>');
  });

  it('nests deeper-depth items as a child list', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
      ],
    };
    expect(html(doc)).toContain('<ul><li>a<ul><li>b</li></ul></li></ul>');
  });

  it('renders an empty doc as nothing', () => {
    expect(html({ blocks: [] })).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/renderDoc.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```tsx
// renderDoc.tsx — pure model → React. Read-only; used by <RichText>. The model
// is flat; this reconstructs list nesting from `depth` at render time.
import { Fragment, type ReactNode } from 'react';
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';

// Outer → inner nesting order so output is stable + diff-friendly.
const MARK_ORDER: MarkType[] = ['link', 'bold', 'italic', 'underline', 'strike', 'code'];

function wrapMark(type: MarkType, mark: Mark, child: ReactNode): ReactNode {
  switch (type) {
    case 'bold':
      return <strong>{child}</strong>;
    case 'italic':
      return <em>{child}</em>;
    case 'underline':
      return <u>{child}</u>;
    case 'strike':
      return <s>{child}</s>;
    case 'code':
      return <code>{child}</code>;
    case 'link':
      return <a href={mark.type === 'link' ? mark.href : undefined}>{child}</a>;
    default:
      return child;
  }
}

function renderRun(run: Inline, key: number): ReactNode {
  const present = MARK_ORDER.filter((t) => run.marks.some((m) => m.type === t));
  let node: ReactNode = run.text;
  // Wrap innermost-first so present[0] (link) ends up outermost.
  for (let i = present.length - 1; i >= 0; i -= 1) {
    const type = present[i];
    const mark = run.marks.find((m) => m.type === type)!;
    node = wrapMark(type, mark, node);
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function renderInlines(inlines: Inline[]): ReactNode {
  return inlines.map((run, i) => renderRun(run, i));
}

function renderBlock(block: Block): ReactNode {
  const content = renderInlines(block.inlines);
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3';
      return <Tag key={block.id}>{content}</Tag>;
    }
    case 'blockquote':
      return <blockquote key={block.id}>{content}</blockquote>;
    case 'code_block':
      return (
        <pre key={block.id}>
          <code>{content}</code>
        </pre>
      );
    case 'paragraph':
    default:
      return <p key={block.id}>{content}</p>;
  }
}

interface ListItemNode {
  key: string;
  content: ReactNode;
  child: ReactNode | null;
}

function isListItem(block: Block): boolean {
  return block.type === 'bullet_item' || block.type === 'ordered_item';
}

// Collect a list starting at `start`, at its base depth; deeper runs become
// child lists attached to the preceding item. Returns the items + next index.
function collectList(
  blocks: Block[],
  start: number,
): { tag: 'ul' | 'ol'; items: ListItemNode[]; next: number } {
  const baseDepth = blocks[start].depth ?? 0;
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: ListItemNode[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = blocks[i].depth ?? 0;
    if (d < baseDepth) break;
    if (d > baseDepth) {
      const sub = collectList(blocks, i);
      if (items.length > 0) items[items.length - 1].child = renderListTree(sub.tag, sub.items);
      i = sub.next;
      continue;
    }
    items.push({ key: blocks[i].id, content: renderInlines(blocks[i].inlines), child: null });
    i += 1;
  }
  return { tag, items, next: i };
}

function renderListTree(tag: 'ul' | 'ol', items: ListItemNode[]): ReactNode {
  const ListTag = tag;
  return (
    <ListTag>
      {items.map((it) => (
        <li key={it.key}>
          {it.content}
          {it.child}
        </li>
      ))}
    </ListTag>
  );
}

/** Render a document to React. Read-only. */
export function renderDoc(doc: RichDoc): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const startId = doc.blocks[i].id;
      const { tag, items, next } = collectList(doc.blocks, i);
      out.push(<Fragment key={`list-${startId}`}>{renderListTree(tag, items)}</Fragment>);
      i = next;
    } else {
      out.push(renderBlock(doc.blocks[i]));
      i += 1;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/renderDoc.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/renderDoc.tsx packages/design-system/src/components/RichText/engine/renderDoc.test.tsx
git commit -m "feat(RichText): read-only model → React renderer"
```

---

## Task 7: Public `<RichText>` component + styles + exports

**Files:**

- Create: `packages/design-system/src/components/RichText/RichText.tsx`
- Create: `packages/design-system/src/components/RichText/RichText.module.scss`
- Create: `packages/design-system/src/components/RichText/RichText.test.tsx`
- Create: `packages/design-system/src/components/RichText/index.ts`

- [ ] **Step 1: Write the styles**

```scss
// RichText.module.scss — prose styles for the read-only renderer. Tokens only
// (Rule 3); inter-block spacing via `gap`/`padding`, never `margin` (Rule 4).
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--color-fg);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
}

.root :where(h1, h2, h3) {
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
.root :where(h1) {
  font-size: var(--font-size-xl);
}
.root :where(h2) {
  font-size: var(--font-size-lg);
}
.root :where(h3) {
  font-size: var(--font-size-md);
}

.root :where(ul, ol) {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-inline-start: var(--space-5);
}

.root :where(blockquote) {
  padding-inline-start: var(--space-3);
  border-inline-start: var(--border-width-thick) solid var(--color-border);
  color: var(--color-fg-muted);
}

.root :where(pre) {
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.root :where(code) {
  font-family: var(--font-family-mono);
  font-size: 0.9em;
}

.root :where(:not(pre) > code) {
  padding: 0 var(--space-1);
  background: var(--color-bg-muted);
  border-radius: var(--radius-sm);
}

.root :where(a) {
  color: var(--color-accent);
  text-decoration: underline;
}
```

> Verify every `var(--…)` exists in `packages/design-system/src/styles/tokens.scss` (grep each). Likely-needs-checking names: `--font-size-xl/lg/md/sm`, `--font-weight-bold`, `--line-height-tight/normal`, `--space-1/3/5`, `--border-width-thick`, `--color-bg-muted`, `--color-border`, `--color-fg-muted`, `--radius-md/sm`, `--font-family-mono`, `--color-accent`. Swap any missing one to the closest existing token (mirror `Code`/`Text`/`Title` SCSS), or add a primitive to `tokens.scss` first. The `0.9em` on `code` is a relative font-size (not a raw token value) — if stylelint's strict-value flags it, replace with a `--font-size-*` token. Run `lint:css` (Step 6) to confirm.

- [ ] **Step 2: Write the component**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import type { RichDoc } from './engine/model';
import { renderDoc } from './engine/renderDoc';
import styles from './RichText.module.scss';

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** The document to render. Build one with `emptyDoc()` / `createBlock()` or the transforms. */
  value: RichDoc;
}

/**
 * Read-only renderer for a rich-text `RichDoc` — paragraphs, H1–H3, bullet/ordered
 * lists, blockquotes, code blocks, and inline marks (bold/italic/underline/strike/
 * code/link) — using the in-house engine (no editor libraries).
 *
 * This is the read-only half of the rich-text story: it **displays** stored rich
 * content (activity feeds, comments, audit views). Editing arrives later as
 * `<RichTextEditor>`.
 *
 * @example
 * // Display a document.
 * const doc = docFromText('Hello world');
 * <RichText value={doc} />;
 *
 * @example
 * // Build structured content with the engine constructors.
 * const doc = { blocks: [
 *   createBlock('heading', 'Notes', { level: 2 }),
 *   createBlock('paragraph', 'See the docs.'),
 * ] };
 * <RichText value={doc} />;
 *
 * @remarks When NOT to use
 * - Plain, unformatted text → use `<Text>`.
 * - Editing rich text → not yet; `<RichTextEditor>` is a later slice.
 *
 * @remarks Anti-patterns
 * - ❌ Mutating a `RichDoc` in place — every engine transform is immutable; render
 *   the returned doc.
 * - ❌ Hand-writing HTML to display rich content — feed a `RichDoc` to `<RichText>`.
 */
export const RichText = forwardRef<HTMLDivElement, RichTextProps>(function RichText(
  { value, className, ...props },
  ref,
) {
  // {...props} last so the consumer can override anything except the composed
  // className (Pattern A — consumer wins).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {renderDoc(value)}
    </div>
  );
});
```

- [ ] **Step 3: Write the component test**

```tsx
import { render, screen } from '@testing-library/react';
import { RichText } from './RichText';
import { createBlock, docFromText } from './engine/model';
import type { RichDoc } from './engine/model';

describe('RichText', () => {
  it('renders a document', () => {
    render(<RichText value={docFromText('Hello world')} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders structured blocks', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'Title', { level: 2, id: '1' }),
        createBlock('bullet_item', 'item', { id: '2' }),
      ],
    };
    render(<RichText value={doc} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('item');
  });

  it('forwards ref to the root div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<RichText ref={ref} value={docFromText('x')} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className and spreads props', () => {
    const { container } = render(
      <RichText value={docFromText('x')} className="custom" data-testid="rt" />,
    );
    expect(container.querySelector('.custom')).not.toBeNull();
    expect(screen.getByTestId('rt')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write the barrel `index.ts`**

```ts
export { RichText } from './RichText';
export type { RichTextProps } from './RichText';
export type {
  RichDoc,
  Block,
  BlockType,
  Inline,
  Mark,
  MarkType,
  Point,
  Range,
} from './engine/model';
export { emptyDoc, createBlock, docFromText } from './engine/model';
export {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
} from './engine/transforms';
```

- [ ] **Step 5: Run the component + structure tests**

Run: `cd packages/design-system && npm test -- src/components/RichText/RichText.test.tsx src/structure.test.ts`
Expected: PASS — RichText has the four required files. (The re-export check in structure.test.ts also needs Task 8; if it fails on the export, do Task 8 then re-run.)

- [ ] **Step 6: Lint the SCSS**

Run (from repo root): `cd /Users/dpws/projects/design-system && npm run lint:css`
Expected: PASS. Fix any flagged raw value by pointing it at a real token.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichText/RichText.tsx packages/design-system/src/components/RichText/RichText.module.scss packages/design-system/src/components/RichText/RichText.test.tsx packages/design-system/src/components/RichText/index.ts
git commit -m "feat(RichText): public read-only component + prose styles + exports"
```

---

## Task 8: Re-export from `src/index.ts`

**Files:**

- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the exports**

Add near the other Display-area exports (e.g. by `Code`/`Text`), matching the file's grouping style:

```ts
export { RichText } from './components/RichText';
export type {
  RichTextProps,
  RichDoc,
  Block,
  BlockType,
  Inline,
  Mark,
  MarkType,
  Point,
  Range,
} from './components/RichText';
export {
  emptyDoc,
  createBlock,
  docFromText,
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
} from './components/RichText';
```

> Check for an existing exported `Range`/`Point`/`Block`/`Mark`/`Inline` type name collision in `src/index.ts` (grep). If any collides with another component's export, alias the RichText one (e.g. `RichDoc`, `RichBlock`, …) consistently in both `index.ts` files and the component's `index.ts`. (`Range` is the most likely collision — if so, export it as `RichRange` from both barrels.)

- [ ] **Step 2: Run the structure + a typecheck**

Run: `cd packages/design-system && npm test -- src/structure.test.ts && npm run typecheck`
Expected: PASS — `RichText` re-export detected; types resolve.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "feat(RichText): re-export from package root"
```

---

## Task 9: Manifest classification + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`
- Modify: `packages/design-system/src/components.manifest.json` (generated)
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add `RichText: 'Display'` to BOTH CLUSTERS maps**

In `packages/design-system/src/_meta/manifest.ts`, under the `// Display` section of `CLUSTERS`, add:

```ts
  RichText: 'Display',
```

In `packages/design-system/scripts/generate-manifest.mjs`, under its `// Display` section, add the identical line:

```js
  RichText: 'Display',
```

- [ ] **Step 2: Regenerate the manifest JSON**

Run: `cd packages/design-system && npm run build:manifest`
Expected: prints the regenerated summary; `src/components.manifest.json` gains a `RichText` entry with `tier: "primitive"`, `cluster: "Display"`, `composes: []`.

- [ ] **Step 3: Run the manifest drift test**

Run: `cd packages/design-system && npm test -- src/_meta/manifest.test.ts`
Expected: PASS.

- [ ] **Step 4: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, add a section in the Display grouping, matching neighboring entries' format:

````markdown
### `<RichText>` — read-only rich-text renderer

Renders a `RichDoc` (the in-house rich-text model) read-only: paragraphs, H1–H3, bullet/ordered lists, blockquotes, code blocks, and inline marks (bold/italic/underline/strike/code/link). No editor libraries. Build docs with the exported engine constructors/transforms.

```tsx
const doc = {
  blocks: [
    createBlock('heading', 'Notes', { level: 2 }),
    createBlock('paragraph', 'See the docs.'),
  ],
};
<RichText value={doc} />;
```
````

When NOT to use: plain text → `Text`. Editing isn't here yet — `RichTextEditor` is a later slice. The model is immutable; render the doc returned by a transform, never mutate in place.

````

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(RichText): manifest cluster + AGENTS.md entry"
````

---

## Task 10: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/RichTextDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write the demo page**

```tsx
import { useState } from 'react';
import {
  RichText,
  createBlock,
  toggleMark,
  setBlockType,
  type RichDoc,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';

const SAMPLE: RichDoc = {
  blocks: [
    createBlock('heading', 'Release notes', { level: 1, id: 'h' }),
    {
      id: 'p',
      type: 'paragraph',
      inlines: [
        { text: 'We shipped ', marks: [] },
        { text: 'bold', marks: [{ type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'italic', marks: [{ type: 'italic' }] },
        { text: ' with a ', marks: [] },
        { text: 'link', marks: [{ type: 'link', href: '/docs' }] },
        { text: '.', marks: [] },
      ],
    },
    createBlock('bullet_item', 'First item', { id: 'l1' }),
    createBlock('bullet_item', 'Second item', { id: 'l2' }),
    createBlock('blockquote', 'A quote block.', { id: 'q' }),
  ],
};

export function RichTextDemo() {
  // A live doc the engine transforms operate on — proves the engine without a full editor.
  const [doc, setDoc] = useState<RichDoc>(SAMPLE);

  const boldHeading = () =>
    setDoc(
      (d) =>
        toggleMark(
          d,
          { anchor: { blockId: 'h', offset: 0 }, focus: { blockId: 'h', offset: 13 } },
          {
            type: 'bold',
          },
        ).doc,
    );
  const quoteToParagraph = () => setDoc((d) => setBlockType(d, 'q', { type: 'paragraph' }).doc);
  const reset = () => setDoc(SAMPLE);

  return (
    <DemoLayout
      name="RichText"
      componentName="RichText"
      description="Read-only renderer for the in-house rich-text model (paragraphs, headings, lists, quotes, code, and inline marks). The editable RichTextEditor is a later slice."
      files={getComponentFiles('RichText')}
    >
      <Example
        title="Rendering a document"
        description="A RichDoc rendered read-only via the engine's renderer."
        code={`<RichText value={doc} />`}
      >
        <RichText value={SAMPLE} />
      </Example>

      <Example
        title="The engine is live"
        description="These buttons run pure engine transforms on a doc and re-render it — no editor yet, just the model + render working together."
        code={`const r = toggleMark(doc, range, { type: 'bold' });
setDoc(r.doc);`}
      >
        <Cluster gap="sm">
          <Button size="sm" onClick={boldHeading}>
            Toggle bold heading
          </Button>
          <Button size="sm" onClick={quoteToParagraph}>
            Quote → paragraph
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>
            Reset
          </Button>
        </Cluster>
        <RichText value={doc} />
      </Example>
    </DemoLayout>
  );
}
```

> Match `DemoLayout`/`Example`/`Button` prop names against an existing demo (e.g. `TextareaDemo.tsx`, and `Button` `variant`/`size` against `Button.tsx`). If two children inside one `<Example>` need spacing, wrap them in a `<Stack gap="md">` (import from the package) rather than relying on margins.

- [ ] **Step 2: Add the route in `App.tsx`**

Import near the other demo imports:

```tsx
import { RichTextDemo } from './pages/components/RichTextDemo';
```

Route near the other `/components/*` routes:

```tsx
<Route path="/components/rich-text" element={<RichTextDemo />} />
```

- [ ] **Step 3: Add the nav item in `navItems.ts`**

Add a lucide icon import at the top of `packages/playground/src/layout/AppShell/navItems.ts` (alongside the others) — `Pilcrow` fits rich text:

```ts
  Pilcrow,
```

Add the item to the **Display** group's `items` array (near `Code`/`Text`):

```ts
      { to: '/components/rich-text', label: 'RichText', icon: Pilcrow, end: false },
```

> If `Pilcrow` isn't exported by the installed `lucide-react`, pick another present icon (`Type`, `FileText`, `AlignLeft`) — grep the existing imports.

- [ ] **Step 4: Add the overview card in `ComponentsIndex.tsx`**

Import near the other `@eocrm/design-system` imports:

```tsx
import { RichText, createBlock } from '@eocrm/design-system';
```

Add a card object to the index data array (match the `Dot` entry shape):

```tsx
  {
    to: '/components/rich-text',
    name: 'RichText',
    description: 'Read-only renderer for the in-house rich-text model.',
    preview: (
      <RichText
        value={{
          blocks: [
            createBlock('heading', 'Notes', { level: 3, id: 'pi-h' }),
            createBlock('bullet_item', 'Rich content', { id: 'pi-l' }),
          ],
        }}
      />
    ),
  },
```

- [ ] **Step 5: Extend the `ComponentName` union in `registry.ts`**

In `packages/playground/src/pages/mockups/registry.ts`, add `'RichText'` to the `ComponentName` union (this is required because `DemoLayout`'s `componentName` is typed against it — no mockup uses RichText, so no `MOCKUPS` data changes).

- [ ] **Step 6: Build the playground**

Run (repo root): `cd /Users/dpws/projects/design-system && make build`
Expected: PASS (typecheck + bundle). Fix any API mismatch.

- [ ] **Step 7: Visual check**

Run `make dev`, open `http://localhost:8080/components/rich-text`, confirm: the sample doc renders (heading, bold/italic/link, bullet list, quote); the "Toggle bold heading" / "Quote → paragraph" buttons mutate the rendered output; dark theme stays legible. Fix any styling issues (usually a token swap).

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/pages/components/RichTextDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): RichText demo + nav wiring"
```

---

## Task 11: Full gates + library review-fix loop

CLAUDE.md Rule 8 (library changes) requires a review-fix loop before pushing.

- [ ] **Step 1: Run all gates**

From `packages/design-system`:

```bash
npm test
npm run typecheck
npm run build
npm pack --dry-run -w @eocrm/design-system
```

From repo root:

```bash
npm run lint:css
npm run format:check
```

Expected: all PASS; `npm pack --dry-run` shows NO `*.test.*` files and no internal-only paths in the tarball. Run `npx prettier --write` on any file `format:check` flags, then re-commit.

- [ ] **Step 2: Spawn a fresh-context review agent**

Dispatch a `general-purpose` agent targeted at `packages/design-system/src/components/RichText/` (+ the index/manifest/AGENTS/playground changes). Brief it to read `CLAUDE.md`, `AGENTS.md`, `README.md` first, and review Rule 8's 10 categories: bugs (esp. transform edge cases: empty runs, cross-block delete/merge, mark run-splitting + re-normalization, list-depth render grouping), a11y (semantic elements, link href), API consistency, type safety, Rules 1–7, test coverage, token discipline + Rule 4 (no margins), SCSS, cross-package leakage (no playground deps in the library; engine imports only react/clsx), package/distribution. Ask for Critical/Important/Nice-to-have + a verdict.

- [ ] **Step 3: Fix every Critical + Important; document deliberate skips**

- [ ] **Step 4: Re-run gates (Step 1) after fixes**

- [ ] **Step 5: Repeat review until the verdict is "clean enough to stop"**

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix(RichText): address review findings"
```

---

## Task 12: PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/richtext-engine
```

The pre-push hook runs `format:check` + `lint:css` + `typecheck`. Fix any failure (do NOT `--no-verify` without authorization).

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "feat(RichText): in-house rich-text engine + read-only renderer (Slice 1)" --body "$(cat <<'EOF'
Slice 1 of an in-house WYSIWYG engine: the pure document model + transform
functions, plus a read-only <RichText> renderer.

Spec: docs/superpowers/specs/2026-06-18-richtext-engine-design.md
Plan: docs/superpowers/plans/2026-06-18-richtext-engine.md

- Flat model: RichDoc = Block[] (paragraph/heading/list/quote/code) with inline runs + marks
- Pure, immutable transforms built bottom-up (marks → inlines → position → document), fully unit-tested
- Deterministic read-only renderer (list grouping from depth; stable mark nesting)
- Public <RichText value={doc}> + the engine surface exported; no editor libraries
- Editing (RichTextEditor) is a later slice

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for `Quality / check`, then stop for merge authorization**

Run: `gh pr checks --watch`. When green, report back for merge authorization (merging auto-publishes a new version) — do NOT auto-merge.

---

## Self-review (completed during planning)

- **Spec coverage:** model → Task 1; Layer A/B/C/D transforms → Tasks 2–5; renderDoc → Task 6; `<RichText>` + styles + exports → Tasks 7–8; manifest/AGENTS → Task 9; demo + wiring → Task 10; gates/review/PR → Tasks 11–12. Out-of-scope items (serialization, editing) correctly excluded. Every spec section maps to a task.
- **Placeholder scan:** no TBD/TODO; every code step ships complete code. Token-existence and the `Range` name-collision risk are flagged with concrete verification steps, not left vague.
- **Type consistency:** `RichDoc`/`Block`/`Inline`/`Mark`/`MarkType`/`Point`/`Range` defined once in `model.ts` and imported everywhere; function signatures (`marksEqual`, `normalizeInlines`, `mapMarksOverRange`, `sliceInlines`, `blockLength`, `orderedRange`, `insertText`, …) are consistent across tasks; the `{ doc, selection }` transform return shape is uniform. The barrel + `src/index.ts` export the same names.

```

```
