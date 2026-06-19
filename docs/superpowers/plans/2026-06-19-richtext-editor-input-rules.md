# RichTextEditor — Markdown input rules (Slice 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-format on typing — a marker + space at the start of a paragraph converts the block (`# `→heading, `- `→bullet, `1. `→ordered, `> `→blockquote, ` ``` `→code).

**Architecture:** A pure `inputRules.ts` (match a marker; apply via `deleteRange`+`setBlockType`), hooked into the editor's `beforeinput` insertText path. One `commit` per conversion → one undo step. No new public API, no new dependency.

**Tech Stack:** TypeScript, React 19, Vitest (jsdom — `globals: true`, do NOT import `describe`/`it`/`expect`/`vi`).

**Spec:** `docs/superpowers/specs/2026-06-19-richtext-editor-input-rules-design.md`

---

## Context

- **`beforeinput` handler** in `RichTextEditor.tsx` (≈ line 368): early `if (ro || isComposingRef.current) return;` then a `historyUndo`/`historyRedo` net, then `const range = readSelection(root); if (!range) return;`, then a **pending-marks** `insertText` branch, then the generic `applyInput` → `commit(result, kind)`. The input-rule check goes right after `if (!range) return;`, before the pending-marks branch.
- **`commit(result, kind)`** records history; `kind: 'other'` makes the conversion its own undo step (so ⌘Z reverts it). `setPendingMarks`/`pendingAtRef` clear any staged caret mark.
- **Engine:** `deleteRange(doc, range): {doc, selection}` and `setBlockType(doc, blockId, patch): {doc, selection}` (caret at offset 0; cleans up `level`/`depth`) from `../RichText/engine/transforms`. `runsText(inlines): string` from `../RichText/engine/inlines`. `isCollapsed` is already imported in the editor.
- **Tests:** the editor test file mocks `readSelection` via `mockReadSelection` and wraps in `<I18nProvider locale="en">`; `act` is imported from `@testing-library/react`. Vitest globals on.
- Run one file: `cd packages/design-system && npm test -- src/components/RichTextEditor/<file>`. Full gate (root): `make test && make build-lib && make lint && npm run format:check`.

## File structure

- **Create** `src/components/RichTextEditor/inputRules.ts` (+ `inputRules.test.ts`).
- **Modify** `src/components/RichTextEditor/RichTextEditor.tsx` (+ `RichTextEditor.test.tsx`).
- **Modify** demo + `RichTextEditor` JSDoc + `AGENTS.md`.

---

## Task 1: `inputRules.ts`

**Files:** Create `inputRules.ts` + `inputRules.test.ts`.

- [ ] **Step 1: Write `inputRules.test.ts`**

````ts
import { matchBlockRule, applyBlockRule } from './inputRules';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc } from '../RichText/engine/model';

describe('matchBlockRule', () => {
  it('matches heading markers #/##/###', () => {
    expect(matchBlockRule('paragraph', '#', ' ')).toEqual({
      change: { type: 'heading', level: 1 },
      markerLen: 1,
    });
    expect(matchBlockRule('paragraph', '##', ' ')).toEqual({
      change: { type: 'heading', level: 2 },
      markerLen: 2,
    });
    expect(matchBlockRule('paragraph', '###', ' ')).toEqual({
      change: { type: 'heading', level: 3 },
      markerLen: 3,
    });
  });

  it('matches bullet markers -/*/+', () => {
    for (const m of ['-', '*', '+']) {
      expect(matchBlockRule('paragraph', m, ' ')).toEqual({
        change: { type: 'bullet_item', depth: 0 },
        markerLen: 1,
      });
    }
  });

  it('matches ordered markers like 1. and 2)', () => {
    expect(matchBlockRule('paragraph', '1.', ' ')).toEqual({
      change: { type: 'ordered_item', depth: 0 },
      markerLen: 2,
    });
    expect(matchBlockRule('paragraph', '2)', ' ')).toEqual({
      change: { type: 'ordered_item', depth: 0 },
      markerLen: 2,
    });
  });

  it('matches blockquote and code fence', () => {
    expect(matchBlockRule('paragraph', '>', ' ')).toEqual({
      change: { type: 'blockquote' },
      markerLen: 1,
    });
    expect(matchBlockRule('paragraph', '```', ' ')).toEqual({
      change: { type: 'code_block' },
      markerLen: 3,
    });
  });

  it('returns null for non-paragraph source, non-space trigger, and non-markers', () => {
    expect(matchBlockRule('heading', '#', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', '#', 'x')).toBeNull();
    expect(matchBlockRule('paragraph', '#x', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', 'text', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', '####', ' ')).toBeNull();
  });
});

describe('applyBlockRule', () => {
  const collapsed = (blockId: string, offset: number) => ({
    anchor: { blockId, offset },
    focus: { blockId, offset },
  });

  it('strips the marker and sets the heading type/level, caret at 0', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '#foo', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'heading', level: 1 }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('heading');
    expect(r.doc.blocks[0].level).toBe(1);
    expect(r.doc.blocks[0].inlines.map((i) => i.text).join('')).toBe('foo');
    expect(r.selection).toEqual(collapsed('a', 0));
  });

  it('converts a bare marker to an empty block', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '>', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'blockquote' }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('blockquote');
    expect(r.doc.blocks[0].inlines.map((i) => i.text).join('')).toBe('');
  });

  it('sets list depth 0 for a bullet rule', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '-item', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'bullet_item', depth: 0 }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('bullet_item');
    expect(r.doc.blocks[0].depth).toBe(0);
  });
});
````

- [ ] **Step 2: Run → FAIL** (`npm test -- src/components/RichTextEditor/inputRules.test.ts`; module not found).

- [ ] **Step 3: Implement `inputRules.ts`**

````ts
// inputRules.ts — Markdown block input rules for <RichTextEditor>. Pure: match a
// marker typed at the start of a paragraph (the trigger is always a space) and
// apply the block conversion by composing existing engine transforms.
import type { RichDoc, BlockType, Range } from '../RichText/engine/model';
import { deleteRange, setBlockType } from '../RichText/engine/transforms';

/** The block change a matched rule applies. */
export interface BlockRuleChange {
  type: BlockType;
  level?: 1 | 2 | 3;
  depth?: number;
}
export interface BlockRuleMatch {
  change: BlockRuleChange;
  /** Number of leading marker chars to strip from the block. */
  markerLen: number;
}

/** Map an exact marker string to a block change, or null. */
function changeFor(before: string): BlockRuleChange | null {
  switch (before) {
    case '#':
      return { type: 'heading', level: 1 };
    case '##':
      return { type: 'heading', level: 2 };
    case '###':
      return { type: 'heading', level: 3 };
    case '-':
    case '*':
    case '+':
      return { type: 'bullet_item', depth: 0 };
    case '>':
      return { type: 'blockquote' };
    case '```':
      return { type: 'code_block' };
    default:
      return /^\d+[.)]$/.test(before) ? { type: 'ordered_item', depth: 0 } : null;
  }
}

/**
 * Match a block input rule. Fires only when `sourceType` is 'paragraph', the
 * `trigger` is a single space, and `before` (block start → caret) is exactly a
 * marker. Returns the block change + marker length, or null.
 */
export function matchBlockRule(
  sourceType: BlockType,
  before: string,
  trigger: string,
): BlockRuleMatch | null {
  if (sourceType !== 'paragraph' || trigger !== ' ') return null;
  const change = changeFor(before);
  return change ? { change, markerLen: before.length } : null;
}

/**
 * Apply a matched rule to the block: strip the marker prefix, then set the block
 * type (composing `deleteRange` + `setBlockType`). Returns the `{ doc, selection }`
 * commit payload with the caret at the block start.
 */
export function applyBlockRule(
  doc: RichDoc,
  blockId: string,
  match: BlockRuleMatch,
): { doc: RichDoc; selection: Range } {
  const stripped = deleteRange(doc, {
    anchor: { blockId, offset: 0 },
    focus: { blockId, offset: match.markerLen },
  });
  return setBlockType(stripped.doc, blockId, match.change);
}
````

- [ ] **Step 4: Run → PASS** (`npm test -- src/components/RichTextEditor/inputRules.test.ts && npm run typecheck`).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/inputRules.ts packages/design-system/src/components/RichTextEditor/inputRules.test.ts
git commit -m "feat(RichTextEditor): markdown block input rules (pure)"
```

---

## Task 2: Editor wiring

**Files:** Modify `RichTextEditor.tsx` (+ `RichTextEditor.test.tsx`).

- [ ] **Step 1: Write the failing tests**

Add to `RichTextEditor.test.tsx` a new describe block (reuse the existing imports — `act`, `render`, `screen`, `useState`, `RichTextEditor`, `RichDoc`, `I18nProvider`, `mockReadSelection`):

```ts
describe('RichTextEditor input rules', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  function typeSpace(editor: HTMLElement) {
    const evt = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: ' ',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      editor.dispatchEvent(evt);
    });
    return evt;
  }

  function renderWith(text: string) {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: text.length },
      focus: { blockId: 'k', offset: text.length },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text, marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    return screen.getByRole('textbox', { name: 'Rich text editor' });
  }

  it('"# " converts the paragraph to a heading (space consumed)', () => {
    const editor = renderWith('#');
    const evt = typeSpace(editor);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(evt.defaultPrevented).toBe(true);
  });

  it('"- " converts to a bullet list', () => {
    const editor = renderWith('-');
    typeSpace(editor);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('"> " converts to a blockquote', () => {
    const editor = renderWith('>');
    typeSpace(editor);
    expect(editor.querySelector('blockquote')).not.toBeNull();
  });

  it('a space after non-marker text does not convert (inserts normally)', () => {
    const editor = renderWith('x');
    const evt = typeSpace(editor);
    // No rule → the generic insert path handles the space; no heading/list/quote.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(editor.querySelector('blockquote')).toBeNull();
    expect(evt.defaultPrevented).toBe(true); // generic insertText still preventDefaults
    expect(editor).toHaveTextContent('x');
  });
});
```

NOTE on the synthetic event: jsdom's `InputEvent` constructor supports `inputType` and `data`. If in this environment `evt.inputType`/`evt.data` come back empty (so the handler doesn't see the space), fall back to `const evt = new Event('beforeinput', { bubbles: true, cancelable: true }); Object.defineProperty(evt, 'inputType', { value: 'insertText' }); Object.defineProperty(evt, 'data', { value: ' ' });` — keep the assertions identical.

Run `npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx -t "input rules"` → FAIL (no conversion; space inserted as text).

- [ ] **Step 2: Wire the editor**

In `RichTextEditor.tsx`:

1. Add imports:

```tsx
import { matchBlockRule, applyBlockRule } from './inputRules';
import { runsText } from '../RichText/engine/inlines';
```

2. In `onBeforeInput`, immediately AFTER `const range = readSelection(root); if (!range) return;` and BEFORE the pending-marks branch (`const pend = pendingMarksRef.current;`), insert:

```tsx
// Markdown block input rules: a marker + space at the start of a paragraph
// converts the block (e.g. "# " → heading, "- " → bullet). The space is
// consumed; one commit → one undo step (⌘Z reverts the conversion).
if (e.inputType === 'insertText' && e.data === ' ' && isCollapsed(range)) {
  const block = doc.blocks.find((b) => b.id === range.anchor.blockId);
  if (block) {
    const before = runsText(block.inlines).slice(0, range.anchor.offset);
    const match = matchBlockRule(block.type, before, ' ');
    if (match) {
      e.preventDefault();
      setPendingMarks(null);
      pendingAtRef.current = null;
      commit(applyBlockRule(doc, block.id, match), 'other');
      return;
    }
  }
}
```

- [ ] **Step 3: Run → PASS** (`npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx && npm run typecheck`). Then the whole dir: `npm test -- src/components/RichTextEditor` (no regression).

- [ ] **Step 4: Manual browser verification (Playwright)** — start the playground, open the RichTextEditor demo, in a toolbar editor:
  1. At the start of an empty paragraph type `# Title` → becomes Heading 1 "Title".
  2. `- item` → bullet list; `1. item` → ordered list; `> quote` → blockquote; ` ``` ` + space → code block.
  3. ⌘Z right after a conversion → reverts to the paragraph with the marker text.
  4. A space typed mid-word (e.g. after "hello") does NOT convert.
     Record outcomes in the PR.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): hook markdown input rules into beforeinput"
```

---

## Task 3: Demo + JSDoc + AGENTS.md

**Files:** Modify `RichTextEditorDemo.tsx`, `RichTextEditor.tsx` (JSDoc), `AGENTS.md`.

- [ ] **Step 1: Demo note** — in `RichTextEditorDemo.tsx`, append to the "Editable with toolbar" `<Example>`'s `description` string:

````
 Type `# `, `- `, `1. `, `> `, or ``` ``` ``` at the start of a line to auto-format.
````

(Just extend the existing string; no new Example.)

- [ ] **Step 2: Verify** — `cd /Users/dpws/projects/design-system && make build-lib && npm run typecheck --workspace playground`. Prettier-fix edited files if `format:check` flags them.

- [ ] **Step 3: JSDoc** — in `RichTextEditor.tsx`'s component JSDoc main description, add a sentence (after the undo/redo sentence):

````
 * Markdown shortcuts auto-format on typing: `# `/`- `/`1. `/`> `/``` ``` ``` at a
 * line start convert the block (Undo reverts the conversion).
````

- [ ] **Step 4: AGENTS.md** — in the `### <RichTextEditor>` section, after the "**Undo/redo:**" paragraph, add:

````markdown
**Input rules:** typing a Markdown marker + space at the start of a paragraph auto-converts the block — `# `/`## `/`### ` → headings, `- `/`* `/`+ ` → bullet list, `1. ` → ordered list, `> ` → blockquote, ` ` ``` → code block. One Undo reverts the conversion.
````

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(RichTextEditor): input rules demo note, JSDoc + AGENTS.md"
```

---

## Final gate (before the Rule-8 review loop + PR)

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

All green; grep `0`. No manifest drift (no new component). Then run the library Hard-rule-8 review-fix loop.

---

## Self-review (plan vs. spec)

**Spec coverage:** `matchBlockRule` (all markers, paragraph-only, space-only, non-marker null) + `applyBlockRule` (strip + setBlockType) → Task 1 ✔; editor `beforeinput` hook (space trigger, before-text, preventDefault, pending-marks clear, `'other'` commit) → Task 2 ✔; demo + JSDoc + AGENTS.md → Task 3 ✔; no public API / manifest / new dep — respected.

**Placeholder scan:** complete code in every step; expected results on commands; the synthetic-event fallback is explicit. No TBD.

**Type consistency:** `BlockRuleChange`/`BlockRuleMatch`, `matchBlockRule(sourceType, before, trigger)`, `applyBlockRule(doc, blockId, match)` used identically across Task 1 + 2. `applyBlockRule` composes the real `deleteRange`/`setBlockType`; `before` via `runsText(...).slice(0, offset)`; the hook reuses the editor's real `commit`/`isCollapsed`/`setPendingMarks`/`pendingAtRef`. ✔
