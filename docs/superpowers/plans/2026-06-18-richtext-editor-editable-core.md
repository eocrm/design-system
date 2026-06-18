# RichTextEditor editable-core (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a controlled `<RichTextEditor value={doc} onChange={setDoc} />` to `@eocrm/design-system` — a contentEditable surface you can type formatted text into, bridging the existing rich-text model to the DOM.

**Architecture:** Controlled contentEditable — the model is the only source of truth. Every mutating input is intercepted (`beforeinput` / `keydown` / composition), `preventDefault`'d, mapped to a model Range, replayed as an existing engine transform, then the model is re-rendered and the DOM selection restored. React and contentEditable never fight because the DOM only changes through React.

**Tech Stack:** TypeScript, React, contentEditable + native `beforeinput`, CSS Modules (SCSS + tokens), Vitest + RTL, Playwright for real interaction.

**Spec:** `docs/superpowers/specs/2026-06-18-richtext-editor-editable-core-design.md`
**Builds on:** the Slice-1 engine in `src/components/RichText/engine/` (model + transforms + `renderDoc`), shipped in `@eocrm/design-system@0.1.46`.

---

## Conventions (read before starting)

- Library rules: `packages/design-system/CLAUDE.md`. Four files per component dir (enforced by `src/structure.test.ts`); re-export from `src/index.ts`; `forwardRef` + spread; full JSDoc (Rule 7); tokens-only SCSS (Rule 3); no `margin`/`position`(except internal anchor)/`width`/`flex-grow` (Rule 4); i18n for user-facing strings (Rule 9).
- **Gate command locations:** `npm test` / `npm run typecheck` are per-package (`-w @eocrm/design-system`). **`npm run lint:css` and `npm run format:check` are ROOT scripts** — run from `/Users/dpws/projects/design-system`.
- Vitest `globals: true` — do NOT import `describe`/`it`/`expect`/`vi`. For component tests import `render`/`screen` from `@testing-library/react`.
- Engine imports come from `../RichText/engine/...` (model, transforms, position, inlines, renderDoc). The editor `composes` RichText (manifest).
- Branch: `feat/richtext-editor` (library change → PR required).
- Run `npx prettier --write <files>` before each commit (pre-push runs `format:check`).

---

## Engine signatures you will call (from Slice 1, do not redefine)

From `src/components/RichText/engine/`:

- `model.ts`: types `RichDoc`, `Block`, `Inline`, `Mark`, `MarkType`, `Point`, `Range`; `createBlock`, `emptyDoc`, `docFromText`.
- `transforms.ts`: `insertText(doc, point, text)`, `deleteRange(doc, range)`, `splitBlock(doc, point)`, `mergeBlockBackward(doc, blockId)`, `toggleMark(doc, range, mark)` — each returns `{ doc, selection }`.
- `position.ts`: `blockLength(block)`, `findBlockIndex(doc, blockId)`, `isCollapsed(range)`, `orderedRange(doc, range)`.
- `inlines.ts`: `runsText(inlines)`, `runsLength(inlines)`.
- `renderDoc.tsx`: `renderDoc(doc)` → ReactNode (Task 1 adds an options arg).

---

## File structure

Created under `packages/design-system/src/components/RichTextEditor/`:

| File                         | Responsibility                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------- | ----- |
| `input.ts`                   | pure `applyInput(doc, range, inputType, data)` → `{doc, selection}              | null` |
| `shortcuts.ts`               | pure `applyShortcut(doc, range, keyish)` → `{doc, selection}                    | null` |
| `selection.ts`               | DOM ↔ model: `pointFromDom` / `pointToDom` / `readSelection` / `writeSelection` |
| `RichTextEditor.tsx`         | the controlled component + the loop                                             |
| `RichTextEditor.module.scss` | editable surface styles (uses the shared prose partial)                         |
| `*.test.ts(x)`               | unit tests per module + component test                                          |
| `index.ts`                   | exports                                                                         |

Modified: `src/components/RichText/engine/renderDoc.tsx` (+ its test), `src/components/RichText/RichText.module.scss` → extract `src/components/RichText/_prose.scss`, `src/index.ts`, `src/i18n/messages.ts`+`en.ts`+`ru.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`, `src/components.manifest.json`, `AGENTS.md`, + 5 playground files.

---

## Task 1: `renderDoc` editable option (additive)

Add an `{ editable }` option: when set, block elements get `data-block-id` and empty blocks render a `<br>`. Read-only output is unchanged (so existing tests stay green).

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/renderDoc.tsx`
- Modify (add tests): `packages/design-system/src/components/RichText/engine/renderDoc.test.tsx`

- [ ] **Step 1: Add the failing tests**

Append to `renderDoc.test.tsx` (the `html` helper + imports already exist):

```tsx
import { runsLength } from './inlines';

describe('renderDoc editable option', () => {
  it('adds data-block-id to block elements when editable', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'hi', { id: 'b1' })] };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelector('[data-block-id="b1"]')?.tagName).toBe('P');
  });

  it('renders an empty editable block with a <br>', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '', { id: 'b1' })] };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelector('[data-block-id="b1"]')?.innerHTML).toBe('<br>');
  });

  it('puts data-block-id on each list item when editable', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: 'l1' }),
        createBlock('bullet_item', 'b', { id: 'l2' }),
      ],
    };
    const { container } = render(<>{renderDoc(doc, { editable: true })}</>);
    expect(container.querySelectorAll('li[data-block-id]')).toHaveLength(2);
  });

  it('read-only output is unchanged (no data-block-id)', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'hi', { id: 'b1' })] };
    expect(html(doc)).toBe('<p>hi</p>');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/renderDoc.test.tsx`
Expected: FAIL (renderDoc takes one arg; data-block-id absent).

- [ ] **Step 3: Edit `renderDoc.tsx`**

Add the options type + thread `editable` through. Replace the relevant functions:

```tsx
import { runsText, runsLength } from './inlines';

export interface RenderDocOptions {
  /** Editable surface: add `data-block-id` anchors + render empty blocks with a `<br>`. */
  editable?: boolean;
}

function blockContent(block: Block, editable: boolean): ReactNode {
  if (editable && runsLength(block.inlines) === 0) return <br />;
  return renderInlines(block.inlines);
}

function renderBlock(block: Block, editable: boolean): ReactNode {
  const anchor = editable ? { 'data-block-id': block.id } : undefined;
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level ?? 1}` as 'h1' | 'h2' | 'h3';
      return (
        <Tag key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </Tag>
      );
    }
    case 'blockquote':
      return (
        <blockquote key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </blockquote>
      );
    case 'code_block':
      return (
        <pre key={block.id} {...anchor}>
          <code>
            {editable && runsLength(block.inlines) === 0 ? <br /> : runsText(block.inlines)}
          </code>
        </pre>
      );
    case 'paragraph':
    default:
      return (
        <p key={block.id} {...anchor}>
          {blockContent(block, editable)}
        </p>
      );
  }
}
```

Update the list pieces to carry the block id + editable content. Replace `ListItemNode`, `collectList`, `renderListTree`:

```tsx
interface ListItemNode {
  key: string;
  blockId: string;
  content: ReactNode;
  child: ReactNode | null;
}

function collectList(
  blocks: Block[],
  start: number,
  eff: number[],
  editable: boolean,
): { tag: 'ul' | 'ol'; items: ListItemNode[]; next: number } {
  const baseDepth = eff[start];
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: ListItemNode[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = eff[i];
    if (d < baseDepth) break;
    if (d > baseDepth) {
      const sub = collectList(blocks, i, eff, editable);
      if (items.length > 0)
        items[items.length - 1].child = renderListTree(sub.tag, sub.items, editable);
      i = sub.next;
      continue;
    }
    items.push({
      key: blocks[i].id,
      blockId: blocks[i].id,
      content: blockContent(blocks[i], editable),
      child: null,
    });
    i += 1;
  }
  return { tag, items, next: i };
}

function renderListTree(tag: 'ul' | 'ol', items: ListItemNode[], editable: boolean): ReactNode {
  const ListTag = tag;
  return (
    <ListTag>
      {items.map((it) => (
        <li key={it.key} {...(editable ? { 'data-block-id': it.blockId } : {})}>
          {it.content}
          {it.child}
        </li>
      ))}
    </ListTag>
  );
}
```

Finally, update `renderDoc` to accept options + pass `editable` down:

```tsx
export function renderDoc(doc: RichDoc, options: RenderDocOptions = {}): ReactNode {
  const editable = options.editable ?? false;
  const eff = effectiveDepths(doc.blocks);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const startId = doc.blocks[i].id;
      const { tag, items, next } = collectList(doc.blocks, i, eff, editable);
      out.push(<Fragment key={`list-${startId}`}>{renderListTree(tag, items, editable)}</Fragment>);
      i = next;
    } else {
      out.push(renderBlock(doc.blocks[i], editable));
      i += 1;
    }
  }
  return out;
}
```

> Keep the existing `renderDoc` JSDoc; add a sentence noting the `editable` option. `RichText.tsx` calls `renderDoc(value)` (no options) and is unaffected.

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/renderDoc.test.tsx src/components/RichText/RichText.test.tsx`
Expected: PASS (new editable tests + the unchanged read-only ones + RichText component).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/renderDoc.tsx packages/design-system/src/components/RichText/engine/renderDoc.test.tsx
git commit -m "feat(RichText): renderDoc editable option (data-block-id anchors + empty-block br)"
```

---

## Task 2: `input.ts` — beforeinput → transform (pure, TDD)

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/input.ts`
- Test: `packages/design-system/src/components/RichTextEditor/input.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { applyInput } from './input';
import { createBlock } from '../RichText/engine/model';
import { runsText } from '../RichText/engine/inlines';
import type { RichDoc, Range } from '../RichText/engine/model';

const p = (text: string, id: string) => createBlock('paragraph', text, { id });
const doc = (...t: [string, string][]): RichDoc => ({ blocks: t.map(([x, id]) => p(x, id)) });
const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });

describe('applyInput', () => {
  it('insertText at a collapsed caret', () => {
    const r = applyInput(doc(['ac', 'a']), span(at('a', 1), at('a', 1)), 'insertText', 'b')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abc');
    expect(r.selection.focus).toEqual(at('a', 2));
  });

  it('insertText over a selection replaces it', () => {
    const r = applyInput(doc(['abcd', 'a']), span(at('a', 1), at('a', 3)), 'insertText', 'X')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('aXd');
  });

  it('insertText with empty data is a no-op (null)', () => {
    expect(applyInput(doc(['a', 'a']), span(at('a', 0), at('a', 0)), 'insertText', '')).toBeNull();
  });

  it('insertParagraph splits the block', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 2), at('a', 2)),
      'insertParagraph',
      null,
    )!;
    expect(r.doc.blocks.map((b) => runsText(b.inlines))).toEqual(['ab', 'cd']);
  });

  it('insertLineBreak also splits (soft breaks deferred)', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 2), at('a', 2)),
      'insertLineBreak',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(2);
  });

  it('deleteContentBackward mid-block deletes the previous char', () => {
    const r = applyInput(
      doc(['abc', 'a']),
      span(at('a', 2), at('a', 2)),
      'deleteContentBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ac');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteContentBackward at block start merges into the previous block', () => {
    const r = applyInput(
      doc(['ab', 'a'], ['cd', 'b']),
      span(at('b', 0), at('b', 0)),
      'deleteContentBackward',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
  });

  it('deleteContentForward mid-block deletes the next char', () => {
    const r = applyInput(
      doc(['abc', 'a']),
      span(at('a', 1), at('a', 1)),
      'deleteContentForward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ac');
    expect(r.selection.focus).toEqual(at('a', 1));
  });

  it('deleteContentForward at block end merges the next block back', () => {
    const r = applyInput(
      doc(['ab', 'a'], ['cd', 'b']),
      span(at('a', 2), at('a', 2)),
      'deleteContentForward',
      null,
    )!;
    expect(r.doc.blocks).toHaveLength(1);
    expect(runsText(r.doc.blocks[0].inlines)).toBe('abcd');
  });

  it('deleteContentBackward over a selection deletes the range', () => {
    const r = applyInput(
      doc(['abcd', 'a']),
      span(at('a', 1), at('a', 3)),
      'deleteContentBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('ad');
  });

  it('deleteWordBackward removes the previous word', () => {
    const r = applyInput(
      doc(['foo bar', 'a']),
      span(at('a', 7), at('a', 7)),
      'deleteWordBackward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('foo ');
  });

  it('deleteWordForward removes the next word', () => {
    const r = applyInput(
      doc(['foo bar', 'a']),
      span(at('a', 0), at('a', 0)),
      'deleteWordForward',
      null,
    )!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe(' bar');
  });

  it('insertFromPaste inserts plain text', () => {
    const r = applyInput(doc(['ab', 'a']), span(at('a', 1), at('a', 1)), 'insertFromPaste', 'X')!;
    expect(runsText(r.doc.blocks[0].inlines)).toBe('aXb');
  });

  it('formatBold and unknown types return null (handled elsewhere)', () => {
    const d = doc(['ab', 'a']);
    const r = span(at('a', 0), at('a', 1));
    expect(applyInput(d, r, 'formatBold', null)).toBeNull();
    expect(applyInput(d, r, 'historyUndo', null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/input.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `input.ts`**

```ts
// input.ts — map a contentEditable `beforeinput` (inputType + data) at a model
// Range to an engine transform. Pure: returns the new { doc, selection } or null
// (null = unsupported; the caller still preventDefaults format* etc.).
import type { RichDoc, Range, Point } from '../RichText/engine/model';
import {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
} from '../RichText/engine/transforms';
import { isCollapsed, blockLength, findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';

export type InputResult = { doc: RichDoc; selection: Range } | null;

function point(blockId: string, offset: number): Point {
  return { blockId, offset };
}

function deleteBackward(doc: RichDoc, caret: Point): InputResult {
  if (caret.offset > 0) {
    return deleteRange(doc, { anchor: point(caret.blockId, caret.offset - 1), focus: caret });
  }
  return mergeBlockBackward(doc, caret.blockId);
}

function deleteForward(doc: RichDoc, caret: Point): InputResult {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  if (caret.offset < blockLength(doc.blocks[idx])) {
    return deleteRange(doc, { anchor: caret, focus: point(caret.blockId, caret.offset + 1) });
  }
  const next = doc.blocks[idx + 1];
  return next ? mergeBlockBackward(doc, next.id) : null;
}

function wordBoundaryBackward(text: string, offset: number): number {
  let i = offset;
  while (i > 0 && /\s/.test(text[i - 1])) i -= 1;
  while (i > 0 && !/\s/.test(text[i - 1])) i -= 1;
  return i;
}

function wordBoundaryForward(text: string, offset: number): number {
  let i = offset;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  while (i < text.length && !/\s/.test(text[i])) i += 1;
  return i;
}

function deleteWord(doc: RichDoc, caret: Point, dir: 'backward' | 'forward'): InputResult {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  const text = runsText(doc.blocks[idx].inlines);
  if (dir === 'backward') {
    if (caret.offset === 0) return mergeBlockBackward(doc, caret.blockId);
    const start = wordBoundaryBackward(text, caret.offset);
    return deleteRange(doc, { anchor: point(caret.blockId, start), focus: caret });
  }
  if (caret.offset >= text.length) {
    const next = doc.blocks[idx + 1];
    return next ? mergeBlockBackward(doc, next.id) : null;
  }
  const end = wordBoundaryForward(text, caret.offset);
  return deleteRange(doc, { anchor: caret, focus: point(caret.blockId, end) });
}

export function applyInput(
  doc: RichDoc,
  range: Range,
  inputType: string,
  data: string | null,
): InputResult {
  const collapsed = isCollapsed(range);
  switch (inputType) {
    case 'insertText':
    case 'insertReplacementText':
    case 'insertFromPaste': {
      const text = data ?? '';
      if (text === '') return null;
      if (!collapsed) {
        const del = deleteRange(doc, range);
        return insertText(del.doc, del.selection.anchor, text);
      }
      return insertText(doc, range.anchor, text);
    }
    case 'insertParagraph':
    case 'insertLineBreak': {
      if (!collapsed) {
        const del = deleteRange(doc, range);
        return splitBlock(del.doc, del.selection.anchor);
      }
      return splitBlock(doc, range.anchor);
    }
    case 'deleteContentBackward':
      return collapsed ? deleteBackward(doc, range.anchor) : deleteRange(doc, range);
    case 'deleteContentForward':
      return collapsed ? deleteForward(doc, range.anchor) : deleteRange(doc, range);
    case 'deleteWordBackward':
      return collapsed ? deleteWord(doc, range.anchor, 'backward') : deleteRange(doc, range);
    case 'deleteWordForward':
      return collapsed ? deleteWord(doc, range.anchor, 'forward') : deleteRange(doc, range);
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/input.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/input.ts packages/design-system/src/components/RichTextEditor/input.test.ts
git commit -m "feat(RichTextEditor): beforeinput → transform mapping"
```

---

## Task 3: `shortcuts.ts` — keydown → mark toggle (pure, TDD)

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/shortcuts.ts`
- Test: `packages/design-system/src/components/RichTextEditor/shortcuts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { applyShortcut } from './shortcuts';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc, Range } from '../RichText/engine/model';

const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
const sel: Range = { anchor: { blockId: 'a', offset: 0 }, focus: { blockId: 'a', offset: 4 } };
const key = (
  k: string,
  mod: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {},
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...mod,
});

describe('applyShortcut', () => {
  it('Mod+B toggles bold over the selection', () => {
    const r = applyShortcut(doc, sel, key('b', { metaKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'bold' }]);
  });

  it('Ctrl+I toggles italic', () => {
    const r = applyShortcut(doc, sel, key('i', { ctrlKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'italic' }]);
  });

  it('Mod+U toggles underline', () => {
    const r = applyShortcut(doc, sel, key('u', { metaKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'underline' }]);
  });

  it('Mod+Shift+X toggles strike', () => {
    const r = applyShortcut(doc, sel, key('x', { metaKey: true, shiftKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'strike' }]);
  });

  it('uppercase key still matches', () => {
    expect(applyShortcut(doc, sel, key('B', { metaKey: true }))).not.toBeNull();
  });

  it('no modifier → null', () => {
    expect(applyShortcut(doc, sel, key('b'))).toBeNull();
  });

  it('Mod+B with shift → null (not a defined shortcut)', () => {
    expect(applyShortcut(doc, sel, key('b', { metaKey: true, shiftKey: true }))).toBeNull();
  });

  it('non-shortcut key with modifier → null', () => {
    expect(applyShortcut(doc, sel, key('a', { metaKey: true }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/shortcuts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `shortcuts.ts`**

```ts
// shortcuts.ts — map a keydown to an inline-mark toggle. Pure: returns the new
// { doc, selection } or null (not a shortcut → caller lets the key through).
import type { RichDoc, Range, Mark } from '../RichText/engine/model';
import { toggleMark } from '../RichText/engine/transforms';

export type ShortcutResult = { doc: RichDoc; selection: Range } | null;

export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

export function applyShortcut(doc: RichDoc, range: Range, e: ShortcutKey): ShortcutResult {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const k = e.key.toLowerCase();
  let mark: Mark | null = null;
  if (k === 'b' && !e.shiftKey) mark = { type: 'bold' };
  else if (k === 'i' && !e.shiftKey) mark = { type: 'italic' };
  else if (k === 'u' && !e.shiftKey) mark = { type: 'underline' };
  else if (k === 'x' && e.shiftKey) mark = { type: 'strike' };
  if (!mark) return null;
  return toggleMark(doc, range, mark);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/shortcuts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/shortcuts.ts packages/design-system/src/components/RichTextEditor/shortcuts.test.ts
git commit -m "feat(RichTextEditor): keyboard-shortcut → mark-toggle mapping"
```

---

## Task 4: `selection.ts` — DOM ↔ model mapping (TDD)

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/selection.ts`
- Test: `packages/design-system/src/components/RichTextEditor/selection.test.ts`

- [ ] **Step 1: Write the failing test**

Build a real (jsdom) DOM mirroring the editable render, then assert mapping both ways.

```ts
import { pointFromDom, pointToDom } from './selection';

// Build: <div root><p data-block-id="a">He<strong>ll</strong>o</p><p data-block-id="b"><br></p></div>
function buildRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = '<p data-block-id="a">He<strong>ll</strong>o</p><p data-block-id="b"><br></p>';
  document.body.appendChild(root);
  return root;
}

describe('selection mapping', () => {
  it('pointFromDom: a text node + offset → {blockId, offset} summing prior text', () => {
    const root = buildRoot();
    const strongText = root.querySelector('strong')!.firstChild!; // "ll"
    expect(pointFromDom(root, strongText, 1)).toEqual({ blockId: 'a', offset: 3 }); // "He" + 1 into "ll"
    const firstText = root.querySelector('[data-block-id="a"]')!.firstChild!; // "He"
    expect(pointFromDom(root, firstText, 2)).toEqual({ blockId: 'a', offset: 2 });
    root.remove();
  });

  it('pointFromDom: empty block (block element, 0) → offset 0', () => {
    const root = buildRoot();
    const emptyBlock = root.querySelector('[data-block-id="b"]')!;
    expect(pointFromDom(root, emptyBlock, 0)).toEqual({ blockId: 'b', offset: 0 });
    root.remove();
  });

  it('pointToDom: {blockId, offset} → the text node + local offset', () => {
    const root = buildRoot();
    const r = pointToDom(root, { blockId: 'a', offset: 3 })!;
    expect(r.node.textContent).toBe('ll');
    expect(r.offset).toBe(1);
    root.remove();
  });

  it('pointToDom round-trips with pointFromDom', () => {
    const root = buildRoot();
    const dom = pointToDom(root, { blockId: 'a', offset: 4 })!; // after "Hell"
    expect(pointFromDom(root, dom.node, dom.offset)).toEqual({ blockId: 'a', offset: 4 });
    root.remove();
  });

  it('pointFromDom returns null outside any block', () => {
    const root = buildRoot();
    const outside = document.createElement('span');
    document.body.appendChild(outside);
    expect(pointFromDom(root, outside, 0)).toBeNull();
    outside.remove();
    root.remove();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/selection.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `selection.ts`**

```ts
// selection.ts — map between the contentEditable DOM and model positions. All
// functions take the editable root element; block elements carry `data-block-id`.
import type { Point, Range } from '../RichText/engine/model';

function blockElementFor(root: HTMLElement, node: Node): HTMLElement | null {
  let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.hasAttribute('data-block-id')) return el;
    el = el.parentNode;
  }
  return null;
}

/** Character offset within `blockEl` of (node, offset), summing prior text nodes. */
function offsetWithinBlock(blockEl: HTMLElement, node: Node, offset: number): number {
  if (node === blockEl) return 0; // structural position (e.g. empty block) → block start
  const walker = blockEl.ownerDocument.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let total = 0;
  let n = walker.nextNode();
  while (n) {
    if (n === node) return total + offset;
    total += (n.textContent ?? '').length;
    n = walker.nextNode();
  }
  return total; // node not found among text descendants → block end
}

/** Map a DOM (node, offset) to a model Point, or null if outside any block. */
export function pointFromDom(root: HTMLElement, node: Node, offset: number): Point | null {
  const blockEl = blockElementFor(root, node);
  if (!blockEl) return null;
  return {
    blockId: blockEl.getAttribute('data-block-id')!,
    offset: offsetWithinBlock(blockEl, node, offset),
  };
}

/** Map a model Point to a DOM (node, offset) inside the editable root. */
export function pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null {
  const blockEl = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(point.blockId)}"]`);
  if (!blockEl) return null;
  const walker = blockEl.ownerDocument.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let remaining = point.offset;
  let last: Text | null = null;
  let n = walker.nextNode() as Text | null;
  while (n) {
    const len = n.textContent?.length ?? 0;
    if (remaining <= len) return { node: n, offset: remaining };
    remaining -= len;
    last = n;
    n = walker.nextNode() as Text | null;
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: blockEl, offset: 0 }; // empty block (only a <br>)
}

/** Read the current DOM selection as a model Range, or null if not inside `root`. */
export function readSelection(root: HTMLElement): Range | null {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return null;
  if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;
  const anchor = pointFromDom(root, sel.anchorNode, sel.anchorOffset);
  const focus = pointFromDom(root, sel.focusNode, sel.focusOffset);
  return anchor && focus ? { anchor, focus } : null;
}

/** Set the DOM selection from a model Range. */
export function writeSelection(root: HTMLElement, range: Range): void {
  const sel = root.ownerDocument.getSelection();
  if (!sel) return;
  const a = pointToDom(root, range.anchor);
  const f = pointToDom(root, range.focus);
  if (!a || !f) return;
  const domRange = root.ownerDocument.createRange();
  domRange.setStart(a.node, a.offset);
  domRange.setEnd(a.node, a.offset);
  sel.removeAllRanges();
  sel.addRange(domRange);
  try {
    sel.extend(f.node, f.offset);
  } catch {
    // some environments (jsdom) have a partial Selection — collapsed caret is fine
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/selection.test.ts`
Expected: PASS. (If `CSS.escape` is undefined in the test env, the implementer may add a tiny fallback — jsdom provides it, so it should be fine.)

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/selection.ts packages/design-system/src/components/RichTextEditor/selection.test.ts
git commit -m "feat(RichTextEditor): DOM ↔ model selection mapping"
```

---

## Task 5: Extract the shared prose SCSS partial

Move `RichText`'s prose rules into a partial so the editor reuses them verbatim. `RichText`'s rendered styling must stay identical.

**Files:**

- Create: `packages/design-system/src/components/RichText/_prose.scss`
- Modify: `packages/design-system/src/components/RichText/RichText.module.scss`

- [ ] **Step 1: Read the current `RichText.module.scss`**

Run: `cat packages/design-system/src/components/RichText/RichText.module.scss`

- [ ] **Step 2: Move the prose rules into `_prose.scss`**

Create `_prose.scss` exporting a mixin that applies the element styling to a given root. Use a SCSS mixin so both modules apply identical rules under their own `.root`:

```scss
// _prose.scss — shared rich-text prose styling. Applied via the `prose()` mixin
// so <RichText> (read-only) and <RichTextEditor> render identically. Tokens only.
@mixin prose {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--color-fg);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);

  :where(h1, h2, h3) {
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
  }
  :where(h1) {
    font-size: var(--font-size-xl);
  }
  :where(h2) {
    font-size: var(--font-size-lg);
  }
  :where(h3) {
    font-size: var(--font-size-md);
  }
  :where(ul, ol) {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-inline-start: var(--space-5);
  }
  :where(blockquote) {
    padding-inline-start: var(--space-3);
    border-inline-start: var(--border-width-strong) solid var(--color-border);
    color: var(--color-fg-muted);
  }
  :where(pre) {
    padding: var(--space-3);
    background: var(--color-bg-muted);
    border-radius: var(--radius-md);
    overflow-x: auto;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
  }
  :where(code) {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-code);
  }
  :where(:not(pre) > code) {
    padding: 0 var(--space-1);
    background: var(--color-bg-muted);
    border-radius: var(--radius-sm);
  }
  :where(a) {
    color: var(--color-accent);
    text-decoration: underline;
  }
}
```

> Copy the EXACT property/value pairs from the current `RichText.module.scss` `.root` block into the mixin body (the block above mirrors the Slice-1 styling — reconcile any difference in favor of what's actually in the file so output is unchanged). If `RichText.module.scss` had any extra rule, move it too.

- [ ] **Step 3: Rewrite `RichText.module.scss` to use the mixin**

```scss
@use './prose';

.root {
  @include prose.prose;
}
```

- [ ] **Step 4: Verify RichText output is unchanged**

Run: `cd packages/design-system && npm test -- src/components/RichText/RichText.test.tsx`
Then from repo root: `npm run lint:css`
Expected: PASS (tests assert structure, not computed CSS; lint clean). Manually confirm the mixin contains every rule the old `.root` had.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/_prose.scss packages/design-system/src/components/RichText/RichText.module.scss
git commit -m "refactor(RichText): extract shared prose styling into a partial"
```

---

## Task 6: `RichTextEditor` component + styles + i18n + exports

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Create: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
- Create: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`
- Create: `packages/design-system/src/components/RichTextEditor/index.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts`

- [ ] **Step 1: Add the i18n key**

In `messages.ts` add to the `Messages` interface:

```ts
richTextEditor: {
  /** Default aria-label for the editable region when none is supplied. */
  editorLabel: string;
}
```

In `en.ts`:

```ts
  richTextEditor: {
    editorLabel: 'Rich text editor',
  },
```

In `ru.ts`:

```ts
  richTextEditor: {
    editorLabel: 'Редактор форматированного текста',
  },
```

- [ ] **Step 2: Write the styles**

```scss
@use '../RichText/prose';

.root {
  @include prose.prose;

  position: relative; // anchors the empty-state placeholder ::before
  min-height: var(--size-12);
  padding: var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  outline: none;
  cursor: text;
  white-space: pre-wrap;
}

.root:focus-visible {
  border-color: var(--color-accent);
  box-shadow: var(--ring-accent);
}

.root[data-empty]::before {
  content: attr(data-placeholder);
  position: absolute;
  color: var(--color-fg-subtle);
  pointer-events: none;
}

.root.readOnly {
  cursor: default;
  background: var(--color-bg-muted);
}
```

> Verify every token exists in `src/styles/tokens.scss` (`--size-12`, `--color-bg-surface`, `--ring-accent`, etc.); swap to the nearest real token if not (mirror `LiquidEditor.tokens.scss` / `Textarea`). `lint:css` (Step 6) is the gate.

- [ ] **Step 3: Write the component**

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import type { RichDoc, Range } from '../RichText/engine/model';
import { renderDoc } from '../RichText/engine/renderDoc';
import { blockLength } from '../RichText/engine/position';
import { useTranslation } from '../../i18n';
import { readSelection, writeSelection } from './selection';
import { applyInput } from './input';
import { applyShortcut } from './shortcuts';
import styles from './RichTextEditor.module.scss';

export interface RichTextEditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'children'
> {
  /** Controlled document. Render the doc returned by `onChange` back into `value`. */
  value: RichDoc;
  /** Fires with the new document after every edit. */
  onChange: (doc: RichDoc) => void;
  /** Non-editable: renders the content read-only (prefer `<RichText>` for pure display). */
  readOnly?: boolean;
  /** Shown when the document is empty. */
  placeholder?: string;
  /** Focus the editor on mount. */
  autoFocus?: boolean;
}

function isEmptyDoc(doc: RichDoc): boolean {
  return doc.blocks.length === 1 && blockLength(doc.blocks[0]) === 0;
}

/**
 * Controlled rich-text editor — a contentEditable surface over the in-house
 * engine. Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a
 * selection; Enter splits, Backspace/Delete merge. The model is the source of
 * truth: every input is replayed as an engine transform and the DOM re-rendered.
 *
 * @example
 * const [doc, setDoc] = useState(emptyDoc());
 * <RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />
 *
 * @remarks When NOT to use
 * - Displaying read-only content → `<RichText>` (or `<RichTextEditor readOnly>`).
 *
 * @remarks Anti-patterns
 * - ❌ Treating it as uncontrolled — you MUST feed `onChange`'s doc back into
 *   `value`, or edits won't stick.
 * - ❌ Mutating `value` in place — pass the new doc the transforms return.
 * - ❌ Expecting a toolbar / lists / links / undo — not in this slice; use the
 *   keyboard shortcuts for marks and Enter/Backspace for structure.
 */
export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, readOnly = false, placeholder, autoFocus, className, ...rest },
    ref,
  ) {
    const t = useTranslation();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const isComposingRef = useRef(false);
    // Selection to restore after the next model-driven re-render.
    const pendingSelectionRef = useRef<Range | null>(null);
    // Latest props for the native beforeinput listener (avoids stale closures).
    const latest = useRef({ value, onChange, readOnly });
    latest.current = { value, onChange, readOnly };

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const commit = useCallback((result: { doc: RichDoc; selection: Range }) => {
      pendingSelectionRef.current = result.selection;
      latest.current.onChange(result.doc);
    }, []);

    // Restore the caret/selection after a model-driven re-render.
    useLayoutEffect(() => {
      const root = rootRef.current;
      const pending = pendingSelectionRef.current;
      if (root && pending) {
        writeSelection(root, pending);
        pendingSelectionRef.current = null;
      }
    }, [value]);

    // Native beforeinput (React's onBeforeInput is NOT the modern beforeinput).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const onBeforeInput = (e: InputEvent) => {
        const { value: doc, readOnly: ro } = latest.current;
        if (ro || isComposingRef.current) return;
        const range = readSelection(root);
        if (!range) return;
        const data = e.data ?? e.dataTransfer?.getData('text/plain') ?? null;
        const result = applyInput(doc, range, e.inputType, data);
        if (result === null) {
          // Unsupported (incl. format* from ⌘B) — stop the browser editing, no model change.
          if (e.inputType.startsWith('format')) e.preventDefault();
          return;
        }
        e.preventDefault();
        commit(result);
      };
      root.addEventListener('beforeinput', onBeforeInput);
      return () => root.removeEventListener('beforeinput', onBeforeInput);
    }, [commit]);

    useEffect(() => {
      if (autoFocus) rootRef.current?.focus();
    }, [autoFocus]);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const root = rootRef.current;
        if (!root) return;
        const range = readSelection(root);
        if (!range) return;
        const result = applyShortcut(value, range, e);
        if (!result) return;
        e.preventDefault();
        commit(result);
      },
      [value, readOnly, commit],
    );

    const onCompositionStart = useCallback(() => {
      isComposingRef.current = true;
    }, []);

    const onCompositionEnd = useCallback(
      (e: React.CompositionEvent<HTMLDivElement>) => {
        isComposingRef.current = false;
        const root = rootRef.current;
        if (readOnly || !root) return;
        const text = e.data;
        if (!text) return;
        // The browser composed text into the DOM (diverged from the model). Read
        // where the caret now is, map it back, and replace the composed span:
        // delete the composed text length before the caret, then insert it into
        // the model — then re-render snaps the DOM back to the model.
        const range = readSelection(root);
        if (!range) return;
        const caret = range.focus;
        const start = { blockId: caret.blockId, offset: Math.max(0, caret.offset - text.length) };
        const result = applyInput(value, { anchor: start, focus: caret }, 'insertText', text);
        if (result) commit(result);
      },
      [value, readOnly, commit],
    );

    return (
      <div
        {...rest}
        ref={setRefs}
        className={clsx(styles.root, readOnly && styles.readOnly, className)}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-readonly={readOnly || undefined}
        aria-label={
          rest['aria-label'] ??
          (rest['aria-labelledby'] ? undefined : t('richTextEditor.editorLabel'))
        }
        data-empty={isEmptyDoc(value) ? '' : undefined}
        data-placeholder={placeholder}
        spellCheck
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      >
        {renderDoc(value, { editable: true })}
      </div>
    );
  },
);
```

> The composition reconciliation is the genuinely hard part and is scoped as "basic IME" — verify it in the browser (Step 9 / Task 9). If React/DOM reconciliation flickers after `compositionend`, the implementer may force a clean re-sync by bumping a `key` on the root after composition; note any such adjustment.

- [ ] **Step 4: Write the component test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import { docFromText, emptyDoc } from '../RichText/engine/model';
import { I18nProvider } from '../../i18n';
import type { RichDoc } from '../RichText/engine/model';
import * as selection from './selection';

function renderEditor(ui: React.ReactElement) {
  return render(<I18nProvider locale="en">{ui}</I18nProvider>);
}

describe('RichTextEditor', () => {
  it('renders the document in a contentEditable textbox', () => {
    renderEditor(<RichTextEditor value={docFromText('hello')} onChange={() => {}} />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('contenteditable', 'true');
    expect(box).toHaveTextContent('hello');
  });

  it('uses the default aria-label when none supplied', () => {
    renderEditor(<RichTextEditor value={emptyDoc()} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Rich text editor');
  });

  it('readOnly drops contentEditable', () => {
    renderEditor(<RichTextEditor value={docFromText('x')} onChange={() => {}} readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false');
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null as HTMLDivElement | null };
    const { container } = renderEditor(
      <RichTextEditor ref={ref} value={emptyDoc()} onChange={() => {}} className="custom" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('.custom')).not.toBeNull();
  });

  it('shows the placeholder when empty', () => {
    renderEditor(<RichTextEditor value={emptyDoc()} onChange={() => {}} placeholder="Write…" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('data-empty', '');
    expect(box).toHaveAttribute('data-placeholder', 'Write…');
  });

  it('⌘B toggles bold over the selection (onChange fires with marked doc)', async () => {
    const user = userEvent.setup();
    // Stub readSelection to a fixed full-block range (jsdom has no real caret).
    const spy = vi
      .spyOn(selection, 'readSelection')
      .mockReturnValue({ anchor: { blockId: 'k', offset: 0 }, focus: { blockId: 'k', offset: 5 } });
    try {
      function Harness() {
        const [doc, setDoc] = useState<RichDoc>({
          blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
        });
        return <RichTextEditor value={doc} onChange={setDoc} />;
      }
      renderEditor(<Harness />);
      const box = screen.getByRole('textbox');
      box.focus();
      await user.keyboard('{Meta>}b{/Meta}');
      expect(box.querySelector('strong')?.textContent).toBe('hello');
    } finally {
      spy.mockRestore();
    }
  });
});
```

> If `vi.spyOn(selection, 'readSelection')` can't replace the import binding under the project's module config, instead `vi.mock('./selection', ...)` at top-of-file with a factory returning a `readSelection` mock + the real `pointFromDom`/`pointToDom`/`writeSelection`. Keep the assertion (⌘B → `<strong>`).

- [ ] **Step 5: Write `index.ts`**

```ts
export { RichTextEditor } from './RichTextEditor';
export type { RichTextEditorProps } from './RichTextEditor';
```

- [ ] **Step 6: Run gates**

```bash
cd packages/design-system && npm test -- src/components/RichTextEditor/ src/structure.test.ts && npm run typecheck
cd /Users/dpws/projects/design-system && npm run lint:css
```

Expected: PASS. (structure.test.ts needs the `src/index.ts` export from Task 7 to fully pass the re-export check — if it fails only on that, do Task 7 then re-run.)

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor packages/design-system/src/i18n
git commit -m "feat(RichTextEditor): controlled contentEditable component + styles + i18n"
```

---

## Task 7: Re-export from `src/index.ts`

**Files:**

- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the export**

Near the Forms-area exports (e.g. by `LiquidEditor`):

```ts
export { RichTextEditor } from './components/RichTextEditor';
export type { RichTextEditorProps } from './components/RichTextEditor';
```

- [ ] **Step 2: Run structure + typecheck**

Run: `cd packages/design-system && npm test -- src/structure.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "feat(RichTextEditor): re-export from package root"
```

---

## Task 8: Manifest + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`, `src/components.manifest.json`, `AGENTS.md`

- [ ] **Step 1: Add `RichTextEditor: 'Forms'` to BOTH CLUSTERS maps**

In `src/_meta/manifest.ts` under `// Forms`:

```ts
  RichTextEditor: 'Forms',
```

In `scripts/generate-manifest.mjs` under `// Forms`, the identical line:

```js
  RichTextEditor: 'Forms',
```

- [ ] **Step 2: Regenerate + verify**

Run: `cd packages/design-system && npm run build:manifest && npm test -- src/_meta/manifest.test.ts`
Expected: `components.manifest.json` gains `RichTextEditor` (tier `composition`, cluster `Forms`, `composes` includes `RichText`); drift test passes.

- [ ] **Step 3: Add the AGENTS.md TL;DR**

In `AGENTS.md`, Forms grouping, matching neighboring format:

````markdown
### `<RichTextEditor>` — controlled rich-text editor (contentEditable)

Controlled WYSIWYG over the in-house engine. `value: RichDoc` + `onChange: (doc) => void` (feed it back into `value`). Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a selection; Enter splits, Backspace/Delete merge.

```tsx
const [doc, setDoc] = useState(emptyDoc());
<RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />;
```
````

When NOT to use: read-only display → `<RichText>`. This slice has no toolbar/lists-UI/links/undo yet (later slices). It's controlled — render `onChange`'s doc back into `value`, never mutate in place.

````

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(RichTextEditor): manifest cluster + AGENTS.md entry"
````

---

## Task 9: Playground demo + wiring + visual verify

**Files:**

- Create: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
- Modify: `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`, `registry.ts`

- [ ] **Step 1: Write the demo**

```tsx
import { useState } from 'react';
import { RichTextEditor, docFromText, Text, Stack, type RichDoc } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function RichTextEditorDemo() {
  const [doc, setDoc] = useState<RichDoc>(docFromText('Type here. Select a word and press ⌘B.'));

  return (
    <DemoLayout
      name="RichTextEditor"
      componentName="RichTextEditor"
      description="Controlled contentEditable rich-text editor over the in-house engine. Type, Enter/Backspace for structure, ⌘/Ctrl+B/I/U + ⌘/Ctrl+⇧X for marks. No toolbar yet (later slice)."
      files={getComponentFiles('RichTextEditor')}
    >
      <Example
        title="Editable"
        description="Type to edit; select text and use ⌘B / ⌘I / ⌘U / ⌘⇧X to format. Enter splits a block; Backspace at a block start merges."
        code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />`}
      >
        <Stack gap="sm">
          <RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />
          <Text size="sm" tone="muted">
            Shortcuts: ⌘/Ctrl+B bold · I italic · U underline · ⇧X strike
          </Text>
        </Stack>
      </Example>

      <Example
        title="Read-only"
        description="Same surface, non-editable (prefer <RichText> for pure display)."
        code={`<RichTextEditor value={doc} onChange={() => {}} readOnly />`}
      >
        <RichTextEditor value={docFromText('Read-only content.')} onChange={() => {}} readOnly />
      </Example>
    </DemoLayout>
  );
}
```

> Confirm `Text` `size`/`tone` props against `Text.tsx`; adjust if needed. `DemoLayout`/`Example` against `TextareaDemo.tsx`.

- [ ] **Step 2: Route in `App.tsx`**

```tsx
import { RichTextEditorDemo } from './pages/components/RichTextEditorDemo';
// ...
<Route path="/components/rich-text-editor" element={<RichTextEditorDemo />} />;
```

- [ ] **Step 3: Nav item in `navItems.ts`** (Forms group)

Add an icon import (e.g. `Pencil`, or `SquarePen` if present) and:

```ts
      { to: '/components/rich-text-editor', label: 'RichTextEditor', icon: Pencil, end: false },
```

> Verify the icon exists in `lucide-react`; else pick a present one (`Pencil`/`PenLine`/`SquarePen`).

- [ ] **Step 4: Card in `ComponentsIndex.tsx`**

```tsx
import { RichTextEditor, docFromText } from '@eocrm/design-system';
// ...
  {
    to: '/components/rich-text-editor',
    name: 'RichTextEditor',
    description: 'Controlled contentEditable rich-text editor over the in-house engine.',
    preview: (
      <RichTextEditor value={docFromText('Editable rich text')} onChange={() => {}} readOnly />
    ),
  },
```

- [ ] **Step 5: `registry.ts`** — add `'RichTextEditor'` to the `ComponentName` union.

- [ ] **Step 6: Build**

Run (repo root): `make build`
Expected: PASS.

- [ ] **Step 7: Visual verification (the real proof — jsdom can't do this)**

`make dev`, open `http://localhost:8080/components/rich-text-editor`, and confirm:

- Type text — characters appear, caret advances correctly (no jumping to start/end).
- Enter splits into a new paragraph; Backspace at a block start merges back; Delete at block end pulls the next block up.
- Select a word, press ⌘B (mac) / Ctrl+B — it bolds; ⌘I/⌘U/⌘⇧X likewise; pressing again un-formats.
- The empty editor shows the placeholder; it disappears on typing.
- Caret lands in the right place after each edit (the selection-restore works).
- Basic IME (if testable): compose a few characters (e.g. via an input method) and confirm the composed text lands once, in the right place.
- Dark theme stays legible; the focus ring shows on focus.
  Fix issues (caret restoration timing, IME reconciliation, token swaps) until it behaves.

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): RichTextEditor demo + nav wiring"
```

---

## Task 10: Full gates + library review-fix loop

- [ ] **Step 1: Run all gates**

From `packages/design-system`: `npm test`, `npm run typecheck`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system` (expect no `*.test.*` / internal paths).
From repo root: `npm run lint:css`, `npm run format:check` (run `npx prettier --write` on anything flagged, re-commit).

- [ ] **Step 2: Spawn a fresh-context Rule-8 reviewer** (`general-purpose`) over `packages/design-system/src/components/RichTextEditor/` + the renderDoc/prose/manifest/index changes. Brief on the 10 categories, with extra focus on: the controlled-contentEditable correctness (does `preventDefault` cover all mutating input? native `beforeinput` vs React's; selection restore timing; IME reconciliation), selection-mapping edge cases, a11y (`role="textbox"`/`aria-multiline`/`aria-readonly`/label), Rule 4 (the `position: relative` is a justified internal anchor for the placeholder), token discipline, cross-package leakage. Ask for Critical/Important/Nice-to-have + verdict.

- [ ] **Step 3:** Fix every Critical + Important; document deliberate skips.

- [ ] **Step 4:** Re-run gates after fixes.

- [ ] **Step 5:** Repeat review until "clean enough to stop".

- [ ] **Step 6:** Commit fixes.

```bash
git add -A && git commit -m "fix(RichTextEditor): address review findings"
```

---

## Task 11: PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/richtext-editor
```

(Pre-push hook: `format:check` + `lint:css` + `typecheck`.)

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "feat(RichTextEditor): controlled contentEditable editor — editable core (Slice 2)" --body "$(cat <<'EOF'
Slice 2 of the in-house WYSIWYG: a controlled contentEditable <RichTextEditor>.

Spec: docs/superpowers/specs/2026-06-18-richtext-editor-editable-core-design.md
Plan: docs/superpowers/plans/2026-06-18-richtext-editor-editable-core.md

- Controlled loop: model is truth; every beforeinput/shortcut is preventDefault'd, replayed as an engine transform, re-rendered, selection restored
- Pure, unit-tested mappers: input (beforeinput→transform), shortcuts (keys→marks), selection (DOM↔model)
- renderDoc gains an `editable` option (data-block-id anchors + empty-block <br>); shared prose SCSS partial
- Type / Enter / Backspace+Delete / ⌘B,I,U,⇧X; basic IME. Toolbar/lists/links/undo are later slices.
- Browser-verified typing, formatting, caret restoration

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for `Quality / check`, then stop for merge authorization** (merging auto-publishes). `gh pr checks --watch`; report when green. Do NOT auto-merge.

---

## Self-review (completed during planning)

- **Spec coverage:** controlled loop → Task 6; renderDoc editable option → Task 1; input mapping → Task 2; shortcuts → Task 3; selection mapping → Task 4; shared prose partial → Task 5; component + i18n + styles + API → Task 6; exports → Task 7; manifest/AGENTS → Task 8; demo + visual verify → Task 9; gates/review/PR → Tasks 10–11. IME basic + deferrals (toolbar/lists/links/undo/collapsed-marks) are out-of-scope per the spec and not implemented. Every spec section maps to a task.
- **Placeholder scan:** no TBD/TODO; complete code in every code step. The genuinely-hard IME reconciliation is implemented AND flagged for browser verification with a concrete fallback (key-bump remount) — not left vague.
- **Type consistency:** `applyInput`/`applyShortcut`/`pointFromDom`/`pointToDom`/`readSelection`/`writeSelection` signatures are consistent across tasks; the `{ doc, selection }` shape matches the engine; `RichDoc`/`Range`/`Point`/`Mark` imported from `../RichText/engine/model`; `renderDoc(doc, { editable })` used consistently in Task 1 and Task 6.

```

```
