# RichTextEditor Mentions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in `@`-mention autocomplete to `<RichTextEditor>` — a configurable trigger opens a floating combobox of consumer-supplied candidates; picking one inserts a styled, atomic-feeling mention chip carrying a stable id that survives an HTML round-trip.

**Architecture:** A mention is a new `mention` mark `{type, id, label}` on a run whose text is `${trigger}${label}` (so the pure render/serialize layer stays trigger-agnostic). Atomicity is layered in the editor: `deleteRange` snaps endpoints out of any mention run it bisects, and `mention` is excluded from mark continuation. A pure `getMentionContext` detects the trigger context; a `useMention` hook owns menu state + async querying; `RichTextMentionMenu` renders a floating listbox modeled on the existing `RichTextLinkEditor`. With no `mentions` prop, behavior is unchanged.

**Tech Stack:** TypeScript, React (forwardRef + hooks), `@floating-ui/react-dom`, Vitest + Testing Library, SCSS modules (tokens only).

**Spec:** `docs/superpowers/specs/2026-06-19-richtext-editor-mentions-design.md`

---

## File map

Engine (`packages/design-system/src/components/RichText/engine/`):

- `model.ts` (modify) — add `mention` to `MarkType` + `Mark`.
- `marks.ts` (modify) — `markKey` distinguishes mentions by id+label.
- `renderDoc.tsx` (modify) — `wrapMark` mention case + `MARK_ORDER`.
- `transforms.ts` (modify) — `insertMention()` + `deleteRange` snap.
- `toHtml.ts` (modify) — mention case + `MARK_ORDER`.
- `fromHtml.ts` (modify) — parse `<span data-mention-id>`.
- `toMarkdown.ts` (modify) — JSDoc note only (no logic change).

Prose (`packages/design-system/src/components/RichText/`):

- `_prose.scss` (modify) — `:where([data-mention])` chip rule.

Editor (`packages/design-system/src/components/RichTextEditor/`):

- `mentions.ts` (new) — public `MentionItem` + `MentionsConfig` types.
- `mentionContext.ts` (new) — pure `getMentionContext`.
- `selection.ts` (modify) — extract + export `Rect` type and `selectionRect`.
- `useMention.ts` (new) — menu-state hook.
- `RichTextMentionMenu.tsx` (new) — floating listbox.
- `RichTextEditor.tsx` (modify) — `mentions` prop, hook wiring, menu render, keydown, ARIA.

Packaging:

- `src/index.ts` (modify) — export `MentionItem`, `MentionsConfig`.
- `src/i18n/{messages,en,ru}.ts` (modify) — `mentionsLabel` + `mentionsEmpty`.
- `packages/design-system/AGENTS.md` (modify) — Mentions note.
- `packages/playground/src/pages/components/RichTextEditorDemo.tsx` (modify) — mentions demo.

---

## Task 1: Model — the `mention` mark + mark-key

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/model.ts:16-25`
- Modify: `packages/design-system/src/components/RichText/engine/marks.ts:4-7`
- Test: `packages/design-system/src/components/RichText/engine/marks.test.ts`

- [ ] **Step 1: Write the failing test** — append to `marks.test.ts`:

```ts
describe('markKey / marksEqual — mentions', () => {
  it('two mentions with different ids are NOT equal', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'mention', id: '2', label: 'Alice' } as const];
    expect(marksEqual(a, b)).toBe(false);
  });

  it('two mentions with the same id+label ARE equal', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    expect(marksEqual(a, b)).toBe(true);
  });

  it('a mention is not equal to a bare-type mark set of different length', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'bold' } as const];
    expect(marksEqual(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/marks.test.ts`
Expected: FAIL — TypeScript error (`'mention'` not assignable to `MarkType`) and/or assertion failure (different ids currently compare equal because `markKey` returns `'mention'` for both).

- [ ] **Step 3: Add the mention variant in `model.ts`**

Replace lines 16-25 (the `MarkType` + `Mark` declarations) with:

```ts
/** All supported inline mark types. `link` carries `href`; `mention` carries `id` + `label`. */
export type MarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'mention';

/** A formatting mark. Flags carry no data; `link` carries an href; `mention` an id + label. */
export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; href: string }
  | { type: 'mention'; id: string; label: string };
```

- [ ] **Step 4: Distinguish mentions in `markKey` (`marks.ts`)**

Replace the `markKey` function (lines 4-7) with:

```ts
/** Canonical key for set comparison (link by href, mention by id+label). */
function markKey(m: Mark): string {
  if (m.type === 'link') return `link:${m.href}`;
  if (m.type === 'mention') return `mention:${m.id}:${m.label}`;
  return m.type;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/marks.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/model.ts \
        packages/design-system/src/components/RichText/engine/marks.ts \
        packages/design-system/src/components/RichText/engine/marks.test.ts
git commit -m "feat(RichText): add mention mark to the model + mark-key"
```

---

## Task 2: Render — the mention chip

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/renderDoc.tsx:15,17-38`
- Modify: `packages/design-system/src/components/RichText/_prose.scss`
- Test: `packages/design-system/src/components/RichText/engine/renderDoc.test.tsx`

- [ ] **Step 1: Write the failing test** — append to `renderDoc.test.tsx` (follow the existing render-to-container pattern in that file; if it uses `renderToStaticMarkup`, mirror it — otherwise use Testing Library `render`):

```ts
it('renders a mention mark as a data-mention span containing the chip text', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'hi ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  const { container } = render(<>{renderDoc(doc)}</>);
  const chip = container.querySelector('[data-mention]') as HTMLElement;
  expect(chip).not.toBeNull();
  expect(chip.tagName).toBe('SPAN');
  expect(chip).toHaveAttribute('data-mention-id', 'u1');
  expect(chip).toHaveAttribute('data-mention-label', 'Alice');
  expect(chip.textContent).toBe('@Alice');
});
```

(Import `render` from `@testing-library/react` and `RichDoc` from `./model` at the top of the test file if not already present.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/renderDoc.test.tsx`
Expected: FAIL — no `[data-mention]` element (the mention mark falls through `wrapMark`'s `default` and renders bare text).

- [ ] **Step 3: Add `mention` to `MARK_ORDER` (renderDoc.tsx line 15)**

```ts
const MARK_ORDER: MarkType[] = ['mention', 'link', 'bold', 'italic', 'underline', 'strike', 'code'];
```

- [ ] **Step 4: Add the `mention` case to `wrapMark` (renderDoc.tsx)** — insert before the `default:` case:

```tsx
    case 'mention':
      return (
        <span
          data-mention
          data-mention-id={mark.type === 'mention' ? mark.id : undefined}
          data-mention-label={mark.type === 'mention' ? mark.label : undefined}
        >
          {child}
        </span>
      );
```

- [ ] **Step 5: Add the chip style to `_prose.scss`** — inside the `@mixin prose { … }` block, after the `:where(a)` rule (around line 64):

```scss
:where([data-mention]) {
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  background: var(--color-accent-bg-subtle);
  color: var(--color-accent);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
```

(All five tokens exist in `src/styles/tokens.scss` — verified: `--space-1`, `--radius-sm`, `--color-accent-bg-subtle`, `--color-accent`, `--font-weight-medium`.)

- [ ] **Step 6: Run the test + stylelint**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/renderDoc.test.tsx && npx stylelint "src/components/RichText/_prose.scss"`
Expected: test PASS; stylelint clean (0 problems).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/renderDoc.tsx \
        packages/design-system/src/components/RichText/_prose.scss \
        packages/design-system/src/components/RichText/engine/renderDoc.test.tsx
git commit -m "feat(RichText): render the mention chip (data-mention span + prose style)"
```

---

## Task 3: Serialize — `toHtml` mention

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/toHtml.ts:13,16-36`
- Test: `packages/design-system/src/components/RichText/engine/toHtml.test.ts`

- [ ] **Step 1: Write the failing test** — append to `toHtml.test.ts`:

```ts
it('serializes a mention mark to a data-mention span', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'cc ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  expect(toHtml(doc)).toBe(
    '<p>cc <span data-mention-id="u1" data-mention-label="Alice">@Alice</span></p>',
  );
});

it('escapes mention id/label attributes', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [{ text: '@A"B', marks: [{ type: 'mention', id: 'a"b', label: 'A"B' }] }],
      },
    ],
  };
  expect(toHtml(doc)).toContain('data-mention-id="a&#39;b"'.replace('&#39;', '&quot;'));
  expect(toHtml(doc)).toContain('data-mention-label="A&quot;B"');
});
```

(The first assertion is the contract; if `escapeAttr` encodes `"` differently than `&quot;`, adjust the second test's expected string to match `escapeAttr`'s actual output — run it to see. Keep the first test exact.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/toHtml.test.ts`
Expected: FAIL — the mention mark is ignored, so output is `<p>cc @Alice</p>` (no span).

- [ ] **Step 3: Add `mention` to `MARK_ORDER` (toHtml.ts line 13)**

```ts
const MARK_ORDER: MarkType[] = ['mention', 'link', 'bold', 'italic', 'underline', 'strike', 'code'];
```

- [ ] **Step 4: Add the `mention` case to `wrapMark` (toHtml.ts)** — insert before the `default:` case:

```ts
    case 'mention': {
      if (mark.type !== 'mention') return inner;
      return `<span data-mention-id="${escapeAttr(mark.id)}" data-mention-label="${escapeAttr(mark.label)}">${inner}</span>`;
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/toHtml.test.ts`
Expected: PASS (adjust the escaping assertion if needed per Step 1's note).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toHtml.ts \
        packages/design-system/src/components/RichText/engine/toHtml.test.ts
git commit -m "feat(RichText): serialize mention marks to HTML"
```

---

## Task 4: Parse — `fromHtml` mention + round-trip

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/fromHtml.ts:89-118`
- Test: `packages/design-system/src/components/RichText/engine/fromHtml.test.ts`

- [ ] **Step 1: Write the failing test** — append to `fromHtml.test.ts`:

```ts
it('parses a data-mention-id span into a mention mark', () => {
  const doc = fromHtml(
    '<p>cc <span data-mention-id="u1" data-mention-label="Alice">@Alice</span></p>',
  );
  const run = doc.blocks[0].inlines.find((r) => r.text === '@Alice');
  expect(run?.marks).toEqual([{ type: 'mention', id: 'u1', label: 'Alice' }]);
});

it('round-trips a mention through toHtml → fromHtml', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'cc ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  const back = fromHtml(toHtml(doc));
  const run = back.blocks[0].inlines.find((r) => r.text === '@Alice');
  expect(run?.marks).toEqual([{ type: 'mention', id: 'u1', label: 'Alice' }]);
});

it('a plain span without data-mention-id is not a mention', () => {
  const doc = fromHtml('<p><span>plain</span></p>');
  expect(doc.blocks[0].inlines.every((r) => r.marks.every((m) => m.type !== 'mention'))).toBe(true);
});

it('a span with an empty data-mention-id is treated as plain text', () => {
  const doc = fromHtml('<p><span data-mention-id="">@x</span></p>');
  expect(doc.blocks[0].inlines.every((r) => r.marks.every((m) => m.type !== 'mention'))).toBe(true);
});
```

(Add `import { toHtml } from './toHtml';` and ensure `RichDoc` is imported in the test file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/fromHtml.test.ts`
Expected: FAIL — the span is unwrapped to bare text (no mention mark).

- [ ] **Step 3: Recognize the mention span in `marksFor` (fromHtml.ts)** — add a `SPAN` case to the `switch (el.tagName)` block (before the closing brace of the switch, alongside the `A` case):

```ts
    case 'SPAN': {
      const id = el.getAttribute('data-mention-id');
      if (id) {
        const label = el.getAttribute('data-mention-label') ?? el.textContent ?? '';
        marks = withMark(marks, { type: 'mention', id, label });
      }
      break;
    }
```

`marksFor` already runs `applyCssMarks(el, marks)` after the switch, so a styled non-mention span still recovers its CSS marks. An empty/absent `data-mention-id` (`id` is `''` → falsy, or `null`) adds no mention mark — the span unwraps as before.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/fromHtml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/fromHtml.ts \
        packages/design-system/src/components/RichText/engine/fromHtml.test.ts
git commit -m "feat(RichText): parse data-mention spans back into mention marks (round-trip)"
```

---

## Task 5: `toMarkdown` — pin the lossy behavior + document it

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/toMarkdown.ts:57-65` (JSDoc only)
- Test: `packages/design-system/src/components/RichText/engine/toMarkdown.test.ts`

No logic change: a mention run's text already contains the trigger (`@Alice`), `mention` is not a Markdown marker, and `@` is not in `escapeMd`/`escapeLineStart`, so `inlineRun` emits the text verbatim.

- [ ] **Step 1: Write the test** — append to `toMarkdown.test.ts`:

```ts
it('serializes a mention as plain text (lossy — id dropped)', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'cc ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  expect(toMarkdown(doc)).toBe('cc @Alice');
});
```

- [ ] **Step 2: Run the test to verify it passes immediately**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/toMarkdown.test.ts`
Expected: PASS (the behavior already holds). If it fails, STOP and reconcile — do not change logic without re-checking the spec.

- [ ] **Step 3: Document the lossiness** — in the `toMarkdown` JSDoc (line ~58), extend the "Lossy" sentence:

Change `Lossy: **underline is dropped**` to:

```
 * Lossy: **underline is dropped** (no Markdown syntax — use `toHtml` for full
 * fidelity) and **mentions degrade to plain `@label` text** (the id is not
 * representable in Markdown — `toHtml`/`fromHtml` preserve mentions);
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toMarkdown.ts \
        packages/design-system/src/components/RichText/engine/toMarkdown.test.ts
git commit -m "test(RichText): pin mention → plain Markdown (lossy) + document it"
```

---

## Task 6: Transforms — `insertMention` + `deleteRange` snap-to-mention

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/transforms.ts:63-83` (deleteRange) + append `insertMention`
- Test: `packages/design-system/src/components/RichText/engine/transforms.test.ts`

- [ ] **Step 1: Write the failing tests** — append to `transforms.test.ts`:

```ts
describe('insertMention', () => {
  const docWith = (text: string): RichDoc => ({
    blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text, marks: [] }] }],
  });

  it('replaces the trigger+query with a chip run + trailing space, caret after', () => {
    // "hi @al" — trigger at offset 3, caret at offset 6
    const { doc, selection } = insertMention(docWith('hi @al'), 'b', { from: 3, to: 6 }, '@', {
      id: 'u1',
      label: 'Alice',
    });
    const runs = doc.blocks[0].inlines;
    expect(runs[0]).toEqual({ text: 'hi ', marks: [] });
    expect(runs[1]).toEqual({
      text: '@Alice',
      marks: [{ type: 'mention', id: 'u1', label: 'Alice' }],
    });
    expect(runs[2].text).toBe(' ');
    // caret after "hi " (3) + "@Alice" (6) + " " (1) = 10
    expect(selection.anchor).toEqual({ blockId: 'b', offset: 10 });
    expect(selection.focus).toEqual({ blockId: 'b', offset: 10 });
  });

  it('handles a bare trigger with no query (from===to-1)', () => {
    const { doc } = insertMention(docWith('@'), 'b', { from: 0, to: 1 }, '@', {
      id: 'u1',
      label: 'Bob',
    });
    expect(doc.blocks[0].inlines[0]).toEqual({
      text: '@Bob',
      marks: [{ type: 'mention', id: 'u1', label: 'Bob' }],
    });
  });

  it('typed text right after a chip does not inherit the mention mark', () => {
    const doc: RichDoc = {
      blocks: [
        {
          id: 'b',
          type: 'paragraph',
          inlines: [{ text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] }],
        },
      ],
    };
    const { doc: out } = insertText(doc, { blockId: 'b', offset: 6 }, 'x');
    const runs = out.blocks[0].inlines;
    const last = runs[runs.length - 1];
    expect(last.text).toBe('x');
    expect(last.marks).toEqual([]);
  });
});

describe('deleteRange — mention snapping', () => {
  const docWithChip = (): RichDoc => ({
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'hi ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
          { text: ' ok', marks: [] },
        ],
      },
    ],
  });

  it('a one-char delete at the chip right edge removes the WHOLE chip (backspace)', () => {
    // chip spans [3,9); caret at 9, backspace deletes [8,9] → snaps to [3,9]
    const { doc, selection } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 8 },
      focus: { blockId: 'b', offset: 9 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
    expect(selection.anchor).toEqual({ blockId: 'b', offset: 3 });
  });

  it('a one-char delete at the chip left edge removes the WHOLE chip (forward delete)', () => {
    // caret at 3, forward delete [3,4] → snaps to [3,9]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 3 },
      focus: { blockId: 'b', offset: 4 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
  });

  it('a selection that partially overlaps the chip removes the whole chip', () => {
    // select [5,7] (inside the chip) → snaps to [3,9]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 5 },
      focus: { blockId: 'b', offset: 7 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe('hi  ok');
  });

  it('a delete entirely outside the chip is unaffected', () => {
    // delete "hi" [0,2]
    const { doc } = deleteRange(docWithChip(), {
      anchor: { blockId: 'b', offset: 0 },
      focus: { blockId: 'b', offset: 2 },
    });
    expect(runsText(doc.blocks[0].inlines)).toBe(' @Alice ok');
  });
});
```

(Ensure `insertMention`, `insertText`, `deleteRange`, `runsText`, and `RichDoc` are imported in the test file.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/transforms.test.ts`
Expected: FAIL — `insertMention` is undefined; snapping tests delete only one char.

- [ ] **Step 3: Stop typed text from inheriting a mention mark (atomicity rule 3)**

In `transforms.ts`, change `marksBefore` (line ~28) so the inherited set never carries `mention` — text typed right after a chip is unmarked even if its trailing space was deleted:

```ts
if (offset - 1 >= pos && offset - 1 < runEnd) return run.marks.filter((m) => m.type !== 'mention');
```

(Keep the rest of `marksBefore` unchanged; only the returned array is filtered.)

- [ ] **Step 4: Add the snap helpers + `insertMention`; modify `deleteRange` (transforms.ts)**

Add these helpers near the top of the file (after the `marksBefore` helper, ~line 29):

```ts
/** Bounds of the mention run strictly containing `offset`, or null. */
function mentionRunBoundsAt(block: Block, offset: number): { start: number; end: number } | null {
  let pos = 0;
  for (const run of block.inlines) {
    const s = pos;
    const e = pos + run.text.length;
    pos = e;
    if (offset > s && offset < e && run.marks.some((m) => m.type === 'mention')) {
      return { start: s, end: e };
    }
  }
  return null;
}

/** Snap a range START leftward out of any mention it bisects. */
function snapStartOffset(block: Block, offset: number): number {
  const b = mentionRunBoundsAt(block, offset);
  return b ? b.start : offset;
}

/** Snap a range END rightward out of any mention it bisects. */
function snapEndOffset(block: Block, offset: number): number {
  const b = mentionRunBoundsAt(block, offset);
  return b ? b.end : offset;
}
```

Replace the body of `deleteRange` (lines 63-83) with:

```ts
export function deleteRange(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range } {
  const ord = orderedRange(doc, range);
  let start = ord.start;
  let end = ord.end;
  // Collapsed input → no-op (never snap a collapsed caret into a deletion).
  if (start.blockId === end.blockId && start.offset === end.offset) {
    return { doc, selection: collapsed(start) };
  }
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return { doc, selection: collapsed(start) };
  // Snap endpoints out of any mention run they bisect, so a partial selection (or
  // a one-char backspace/forward-delete at a chip edge) removes the whole chip.
  start = { ...start, offset: snapStartOffset(doc.blocks[si], start.offset) };
  end = { ...end, offset: snapEndOffset(doc.blocks[ei], end.offset) };
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
```

Append `insertMention` at the end of the file:

```ts
/**
 * Pure/immutable. Replace the block-relative span `[range.from, range.to)` with a
 * mention chip run (`text: trigger + mention.label`, mark `{type:'mention', id,
 * label}`) followed by a single trailing space. Returns `{ doc, selection }` with
 * the caret after the trailing space. No-op (collapsed caret at `range.from`) when
 * `blockId` is not found.
 */
export function insertMention(
  doc: RichDoc,
  blockId: string,
  range: { from: number; to: number },
  trigger: string,
  mention: { id: string; label: string },
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed({ blockId, offset: range.from }) };
  const block = doc.blocks[idx];
  const chipText = `${trigger}${mention.label}`;
  const inlines = normalizeInlines([
    ...sliceInlines(block.inlines, 0, range.from),
    { text: chipText, marks: [{ type: 'mention', id: mention.id, label: mention.label }] },
    { text: ' ', marks: [] },
    ...sliceInlines(block.inlines, range.to, blockLength(block)),
  ]);
  const offset = range.from + chipText.length + 1;
  return {
    doc: replaceBlock(doc, idx, { ...block, inlines }),
    selection: collapsed({ blockId, offset }),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass + the full engine suite (no regressions)**

Run: `cd packages/design-system && npx vitest run src/components/RichText/engine/`
Expected: PASS — new tests green, all existing transform/inline tests still green.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/transforms.ts \
        packages/design-system/src/components/RichText/engine/transforms.test.ts
git commit -m "feat(RichText): insertMention + deleteRange snap + no mark inheritance"
```

---

## Task 7: Public types + pure mention-context detection

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/mentions.ts`
- Create: `packages/design-system/src/components/RichTextEditor/mentionContext.ts`
- Test: `packages/design-system/src/components/RichTextEditor/mentionContext.test.ts`

- [ ] **Step 1: Create the public types (`mentions.ts`)**

```ts
// mentions.ts — public types for the RichTextEditor `mentions` prop.

/** One mentionable candidate returned by `MentionsConfig.onQuery`. */
export interface MentionItem {
  /** Stable id stored on the mention mark and emitted in serialization (`data-mention-id`). */
  id: string;
  /** Display text — becomes the chip's visible text (without the trigger). */
  label: string;
  /** Optional secondary line in the menu row (e.g. an email). Menu-only; not stored. */
  description?: string;
  /** Optional avatar shown in the menu row. Menu-only; not stored. */
  avatarUrl?: string;
}

/**
 * Enables `@`-mention autocomplete on `<RichTextEditor>`. Omit the `mentions`
 * prop to disable mentions entirely.
 */
export interface MentionsConfig {
  /**
   * Resolve candidates for the text typed after the trigger. Called as the user
   * types; may be sync or async. The editor drops stale async resolutions, so a
   * slow promise that resolves after the query moved on is ignored.
   */
  onQuery: (query: string) => MentionItem[] | Promise<MentionItem[]>;
  /** Trigger character that opens the menu. Default `'@'`. */
  trigger?: string;
}
```

- [ ] **Step 2: Write the failing test (`mentionContext.test.ts`)**

```ts
import { getMentionContext } from './mentionContext';

describe('getMentionContext', () => {
  it('opens at the start of a block', () => {
    expect(getMentionContext('@al', 3, '@')).toEqual({ query: 'al', triggerOffset: 0 });
  });

  it('opens after whitespace', () => {
    expect(getMentionContext('hi @al', 6, '@')).toEqual({ query: 'al', triggerOffset: 3 });
  });

  it('returns an empty query right after the trigger', () => {
    expect(getMentionContext('hi @', 4, '@')).toEqual({ query: '', triggerOffset: 3 });
  });

  it('does NOT open mid-word (trigger preceded by a non-space)', () => {
    expect(getMentionContext('email@x', 7, '@')).toBeNull();
  });

  it('does NOT open when a space sits between the trigger and the caret', () => {
    expect(getMentionContext('@al bob', 7, '@')).toBeNull();
  });

  it('chooses the nearest valid trigger', () => {
    expect(getMentionContext('@a @bo', 6, '@')).toEqual({ query: 'bo', triggerOffset: 3 });
  });

  it('honors a custom trigger', () => {
    expect(getMentionContext('see #re', 7, '#')).toEqual({ query: 're', triggerOffset: 4 });
  });

  it('returns null when there is no trigger before the caret', () => {
    expect(getMentionContext('hello', 5, '@')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/mentionContext.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `mentionContext.ts`**

```ts
// mentionContext.ts — pure detection of an open mention context at a caret.

/** A detected, open mention context. */
export interface MentionContext {
  /** Text typed after the trigger, up to the caret (may be ''). */
  query: string;
  /** Offset of the trigger char within the block text. */
  triggerOffset: number;
}

/**
 * Detect an open mention context at a collapsed caret within `blockText`.
 * Returns a context only when the nearest `trigger` before `caretOffset` is at
 * block start or preceded by whitespace, and no whitespace sits between it and
 * the caret. Otherwise returns null.
 *
 * @example
 * getMentionContext('hi @al', 6, '@'); // { query: 'al', triggerOffset: 3 }
 */
export function getMentionContext(
  blockText: string,
  caretOffset: number,
  trigger: string,
): MentionContext | null {
  if (!trigger) return null;
  // Scan backward from the caret to the nearest trigger; bail on whitespace.
  for (let i = caretOffset - 1; i >= 0; i -= 1) {
    const ch = blockText[i];
    if (/\s/.test(ch)) return null; // whitespace between trigger and caret → closed
    if (ch === trigger) {
      const before = i === 0 ? '' : blockText[i - 1];
      if (i !== 0 && !/\s/.test(before)) return null; // mid-word trigger
      return { query: blockText.slice(i + trigger.length, caretOffset), triggerOffset: i };
    }
  }
  return null;
}
```

(Note: a single-char trigger means `blockText[i] === trigger`; `trigger.length` keeps the slice correct.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/mentionContext.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/mentions.ts \
        packages/design-system/src/components/RichTextEditor/mentionContext.ts \
        packages/design-system/src/components/RichTextEditor/mentionContext.test.ts
git commit -m "feat(RichTextEditor): mention public types + pure context detection"
```

---

## Task 8: Extract `selectionRect` + the `useMention` hook

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/selection.ts` (add `Rect` + `selectionRect`)
- Create: `packages/design-system/src/components/RichTextEditor/useMention.ts`
- Test: `packages/design-system/src/components/RichTextEditor/useMention.test.tsx`

- [ ] **Step 1: Add `Rect` + `selectionRect` to `selection.ts`** — append:

```ts
/** A viewport rect (subset of DOMRect) used to anchor floating UI to a selection. */
export type Rect = { top: number; left: number; height: number; width: number };

/** The viewport rect of the current DOM selection, falling back to `root`. */
export function selectionRect(root: HTMLElement): Rect {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    let r: DOMRect | null = null;
    try {
      r = sel.getRangeAt(0).getBoundingClientRect();
    } catch {
      // jsdom does not implement Range.getBoundingClientRect — fall through.
    }
    if (r && (r.width || r.height || r.top || r.left)) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  const rr = root.getBoundingClientRect();
  return { top: rr.top, left: rr.left, width: 0, height: rr.height };
}
```

- [ ] **Step 2: Write the failing test (`useMention.test.tsx`)**

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { RichDoc } from '../RichText/engine/model';

// Mock readSelection (jsdom has no caret); keep the rest of ./selection real.
vi.mock('./selection', async () => {
  const actual = await vi.importActual<typeof import('./selection')>('./selection');
  return { ...actual, readSelection: vi.fn(actual.readSelection) };
});
import { readSelection } from './selection';
import { useMention } from './useMention';

const mockReadSelection = vi.mocked(readSelection);

function makeRoot(): HTMLDivElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

const docWith = (text: string): RichDoc => ({
  blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text, marks: [] }] }],
});

beforeEach(() => mockReadSelection.mockReset());

it('opens and queries with the text after the trigger', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 4 },
    focus: { blockId: 'b', offset: 4 },
  });
  const onQuery = vi.fn().mockResolvedValue([{ id: 'u1', label: 'Alice' }]);
  const onInsert = vi.fn();
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @'),
      trigger: '@',
      onQuery,
      onInsert,
    }),
  );
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith(''));
  await waitFor(() => expect(result.current.open).toBe(true));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
});

it('commitActive inserts the active item over the trigger+query range', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 6 },
    focus: { blockId: 'b', offset: 6 },
  });
  const onQuery = vi.fn().mockResolvedValue([{ id: 'u1', label: 'Alice' }]);
  const onInsert = vi.fn();
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @al'),
      trigger: '@',
      onQuery,
      onInsert,
    }),
  );
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  act(() => result.current.commitActive());
  expect(onInsert).toHaveBeenCalledWith('b', { from: 3, to: 6 }, '@', { id: 'u1', label: 'Alice' });
});

it('drops a stale async resolution', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 5 },
    focus: { blockId: 'b', offset: 5 },
  });
  let resolveFirst: (v: { id: string; label: string }[]) => void = () => {};
  const first = new Promise<{ id: string; label: string }[]>((r) => (resolveFirst = r));
  const onQuery = vi
    .fn()
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce([{ id: 'u2', label: 'Bob' }]);
  const { result, rerender } = renderHook(
    ({ doc }) =>
      useMention({
        enabled: true,
        rootRef: { current: root },
        doc,
        trigger: '@',
        onQuery,
        onInsert: vi.fn(),
      }),
    { initialProps: { doc: docWith('hi @a') } },
  );
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('a'));
  // caret moves: query becomes 'ab'
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 6 },
    focus: { blockId: 'b', offset: 6 },
  });
  rerender({ doc: docWith('hi @ab') });
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('ab'));
  await waitFor(() => expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]));
  // late resolution of the first (stale) query must be ignored
  act(() => resolveFirst([{ id: 'u1', label: 'Alice' }]));
  await Promise.resolve();
  expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/useMention.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `useMention.ts`**

```tsx
// useMention.ts — menu-state hook for RichTextEditor @-mention autocomplete.
// Owns context detection (driven by the editor's selection/content cycle), async
// querying with stale-drop, and the active-index for keyboard navigation. DOM
// glue only; the pure decision lives in mentionContext.ts.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { RichDoc } from '../RichText/engine/model';
import { runsText } from '../RichText/engine/inlines';
import { isCollapsed } from '../RichText/engine/position';
import { readSelection, selectionRect, type Rect } from './selection';
import { getMentionContext } from './mentionContext';
import type { MentionItem } from './mentions';

export interface UseMentionParams {
  enabled: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  doc: RichDoc;
  trigger: string;
  onQuery?: (query: string) => MentionItem[] | Promise<MentionItem[]>;
  /** Perform the insertion (editor wires this to commit(insertMention(...))). */
  onInsert: (
    blockId: string,
    range: { from: number; to: number },
    trigger: string,
    item: MentionItem,
  ) => void;
}

export interface UseMentionResult {
  open: boolean;
  items: MentionItem[];
  activeIndex: number;
  anchorRect: Rect | null;
  listboxId: string;
  activeOptionId: string | undefined;
  getOptionId: (index: number) => string;
  setActiveIndex: (index: number) => void;
  move: (delta: 1 | -1) => void;
  selectIndex: (index: number) => void;
  commitActive: () => void;
  close: () => void;
}

export function useMention(params: UseMentionParams): UseMentionResult {
  const { enabled, rootRef, doc, trigger, onQuery, onInsert } = params;
  const baseId = useId();
  const listboxId = `${baseId}-mention-listbox`;
  const getOptionId = useCallback((index: number) => `${baseId}-mention-opt-${index}`, [baseId]);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MentionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);

  // Detected context (block + range), kept in a ref for commitActive.
  const ctxRef = useRef<{ blockId: string; from: number; to: number } | null>(null);
  // Monotonic token to drop stale async resolutions.
  const queryToken = useRef(0);
  // Last query string we issued (dedupe redundant onQuery calls).
  const lastQuery = useRef<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    ctxRef.current = null;
    lastQuery.current = null;
    queryToken.current += 1; // invalidate any in-flight query
  }, []);

  const runQuery = useCallback(
    (query: string) => {
      if (!onQuery) return;
      const token = (queryToken.current += 1);
      Promise.resolve(onQuery(query)).then(
        (resolved) => {
          if (token !== queryToken.current) return; // stale
          setItems(resolved);
          setActiveIndex(0);
        },
        () => {
          if (token !== queryToken.current) return;
          setItems([]);
          setActiveIndex(0);
        },
      );
    },
    [onQuery],
  );

  const recompute = useCallback(() => {
    const root = rootRef.current;
    if (!enabled || !root || !onQuery) {
      if (open) close();
      return;
    }
    const sel = readSelection(root);
    if (!sel || !isCollapsed(sel)) {
      if (open) close();
      return;
    }
    const block = doc.blocks.find((b) => b.id === sel.anchor.blockId);
    if (!block) {
      if (open) close();
      return;
    }
    const text = runsText(block.inlines);
    const ctx = getMentionContext(text, sel.anchor.offset, trigger);
    if (!ctx) {
      if (open) close();
      return;
    }
    ctxRef.current = {
      blockId: block.id,
      from: ctx.triggerOffset,
      to: ctx.triggerOffset + trigger.length + ctx.query.length,
    };
    setAnchorRect(selectionRect(root));
    setOpen(true);
    if (ctx.query !== lastQuery.current) {
      lastQuery.current = ctx.query;
      runQuery(ctx.query);
    }
  }, [enabled, rootRef, onQuery, doc, trigger, open, close, runQuery]);

  // Recompute on selection changes and on every content (doc) change.
  useEffect(() => {
    if (!enabled) return;
    const handler = () => recompute();
    document.addEventListener('selectionchange', handler);
    recompute();
    return () => document.removeEventListener('selectionchange', handler);
  }, [enabled, recompute]);

  const move = useCallback(
    (delta: 1 | -1) => {
      setActiveIndex((i) => {
        const n = items.length;
        if (n === 0) return 0;
        return (i + delta + n) % n;
      });
    },
    [items.length],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const ctx = ctxRef.current;
      const item = items[index];
      if (!ctx || !item) return;
      onInsert(ctx.blockId, { from: ctx.from, to: ctx.to }, trigger, item);
      close();
    },
    [items, onInsert, trigger, close],
  );

  const commitActive = useCallback(() => selectIndex(activeIndex), [selectIndex, activeIndex]);

  return {
    open,
    items,
    activeIndex,
    anchorRect,
    listboxId,
    activeOptionId: open && items.length > 0 ? getOptionId(activeIndex) : undefined,
    getOptionId,
    setActiveIndex,
    move,
    selectIndex,
    commitActive,
    close,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/useMention.test.tsx`
Expected: PASS. If the stale-drop test is flaky on promise timing, keep the `queryToken` invalidation in `close()` + `runQuery` as written — it is the mechanism under test.

- [ ] **Step 6: Point the editor's local `Rect`/`selectionRect` at the shared ones (no behavior change)**

In `RichTextEditor.tsx`: delete the local `type Rect = …` (line 94) and the local `selectionRect` function (lines 104-120), and import them from `./selection`:

```ts
import { readSelection, writeSelection, selectionRect, type Rect } from './selection';
```

- [ ] **Step 7: Run the editor test suite to confirm no regression from the extraction**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: PASS (unchanged behavior).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/selection.ts \
        packages/design-system/src/components/RichTextEditor/useMention.ts \
        packages/design-system/src/components/RichTextEditor/useMention.test.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx
git commit -m "feat(RichTextEditor): useMention hook + shared selectionRect"
```

---

## Task 9: The floating mention menu component

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/RichTextMentionMenu.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextMentionMenu.test.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss` (menu styles)

- [ ] **Step 1: Write the failing test (`RichTextMentionMenu.test.tsx`)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RichTextMentionMenu } from './RichTextMentionMenu';
import type { MentionItem } from './mentions';

const items: MentionItem[] = [
  { id: 'u1', label: 'Alice', description: 'alice@acme.com' },
  { id: 'u2', label: 'Bob' },
];
const rect = { top: 10, left: 10, width: 0, height: 16 };

function renderMenu(props: Partial<React.ComponentProps<typeof RichTextMentionMenu>> = {}) {
  return render(
    <RichTextMentionMenu
      items={items}
      activeIndex={0}
      anchorRect={rect}
      listboxId="lb"
      getOptionId={(i) => `opt-${i}`}
      label="Mentions"
      emptyLabel="No matches"
      onSelect={vi.fn()}
      onHover={vi.fn()}
      {...props}
    />,
  );
}

it('renders a labelled listbox of options', () => {
  renderMenu();
  const lb = screen.getByRole('listbox', { name: 'Mentions' });
  expect(lb).toHaveAttribute('id', 'lb');
  expect(screen.getAllByRole('option')).toHaveLength(2);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
});

it('marks the active option with aria-selected + id', () => {
  renderMenu({ activeIndex: 1 });
  const opts = screen.getAllByRole('option');
  expect(opts[1]).toHaveAttribute('aria-selected', 'true');
  expect(opts[1]).toHaveAttribute('id', 'opt-1');
  expect(opts[0]).toHaveAttribute('aria-selected', 'false');
});

it('clicking an option calls onSelect with its index', async () => {
  const onSelect = vi.fn();
  renderMenu({ onSelect });
  await userEvent.click(screen.getByText('Bob'));
  expect(onSelect).toHaveBeenCalledWith(1);
});

it('shows the empty label when there are no items', () => {
  renderMenu({ items: [] });
  expect(screen.getByText('No matches')).toBeInTheDocument();
  expect(screen.queryAllByRole('option')).toHaveLength(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/RichTextMentionMenu.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RichTextMentionMenu.tsx`** (model the floating setup on `RichTextLinkEditor.tsx`)

```tsx
// RichTextMentionMenu.tsx — the floating @-mention listbox for <RichTextEditor>.
// Presentational: the editor (via useMention) owns all state and passes the
// items + active index + anchor rect; this renders a role="listbox" positioned at
// the caret rect via a Floating UI virtual element (same portal+virtual-anchor
// pattern as RichTextLinkEditor). Not exported from the package.
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Avatar } from '../Avatar';
import { Text } from '../Text';
import type { MentionItem } from './mentions';
import type { Rect } from './selection';
import styles from './RichTextEditor.module.scss';

export interface RichTextMentionMenuProps {
  items: MentionItem[];
  activeIndex: number;
  anchorRect: Rect;
  listboxId: string;
  getOptionId: (index: number) => string;
  /** Accessible name for the listbox. */
  label: string;
  /** Shown when there are no candidates. */
  emptyLabel: string;
  /** Pick the item at `index`. */
  onSelect: (index: number) => void;
  /** Set the active item (pointer hover). */
  onHover: (index: number) => void;
}

export function RichTextMentionMenu({
  items,
  activeIndex,
  anchorRect,
  listboxId,
  getOptionId,
  label,
  emptyLabel,
  onSelect,
  onHover,
}: RichTextMentionMenuProps) {
  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: anchorRect.left,
        y: anchorRect.top,
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.left + anchorRect.width,
        bottom: anchorRect.top + anchorRect.height,
        width: anchorRect.width,
        height: anchorRect.height,
      }),
    }),
    [anchorRect],
  );

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  return createPortal(
    <div
      ref={refs.setFloating}
      className={styles.mentionMenu}
      style={floatingStyles}
      role="listbox"
      id={listboxId}
      aria-label={label}
    >
      {items.length === 0 ? (
        <div className={styles.mentionEmpty} aria-disabled="true">
          <Text size="sm" tone="muted">
            {emptyLabel}
          </Text>
        </div>
      ) : (
        items.map((item, i) => (
          <div
            key={item.id}
            id={getOptionId(i)}
            role="option"
            aria-selected={i === activeIndex}
            className={i === activeIndex ? styles.mentionOptionActive : styles.mentionOption}
            // pointerdown (not click) so the editor doesn't lose its selection first
            onPointerDown={(e) => {
              e.preventDefault();
              onSelect(i);
            }}
            onMouseMove={() => onHover(i)}
          >
            <Avatar name={item.label} src={item.avatarUrl} size="sm" />
            <span className={styles.mentionText}>
              <Text size="sm">{item.label}</Text>
              {item.description ? (
                <Text size="xs" tone="muted">
                  {item.description}
                </Text>
              ) : null}
            </span>
          </div>
        ))
      )}
    </div>,
    document.body,
  );
}
```

(If `size="sm"` is not a valid `AvatarSize`, use the smallest valid value — check `Avatar`'s `AvatarSize` union; likewise for `Text` `size="xs"`, fall back to `size="sm"` if `xs` is unsupported. The click test uses `onPointerDown`; `userEvent.click` dispatches pointerdown so it still fires.)

- [ ] **Step 4: Add the menu styles to `RichTextEditor.module.scss`** (tokens only — no layout `margin`/`position` beyond what Floating UI sets inline via `style`):

```scss
.mentionMenu {
  display: flex;
  flex-direction: column;
  min-width: var(--size-9);
  max-width: var(--size-13);
  max-height: var(--size-12);
  overflow-y: auto;
  padding: var(--space-1);
  background: var(--color-bg-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.mentionOption,
.mentionOptionActive {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.mentionOptionActive {
  background: var(--color-bg-hover);
}

.mentionText {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mentionEmpty {
  padding: var(--space-2);
}
```

(Verify each token exists in `tokens.scss`; if `--color-bg-raised`, `--color-bg-hover`, `--shadow-md`, `--size-9/12/13`, or `--border-width` differ in name, substitute the existing equivalent the other floating components use — check how `.linkBubble` is styled in this same file and reuse those exact tokens for surface/border/shadow. Do NOT introduce raw values; add a token to `tokens.scss` first if truly missing.)

- [ ] **Step 5: Run the test + stylelint**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/RichTextMentionMenu.test.tsx && npx stylelint "src/components/RichTextEditor/RichTextEditor.module.scss"`
Expected: test PASS; stylelint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextMentionMenu.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextMentionMenu.test.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "feat(RichTextEditor): floating mention listbox component"
```

---

## Task 10: Wire mentions into the editor

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing integration tests** — append to `RichTextEditor.test.tsx` a new describe block:

```tsx
describe('RichTextEditor mentions', () => {
  beforeEach(() => mockReadSelection.mockReset());

  const usersQuery = (q: string) =>
    Promise.resolve(
      [
        { id: 'u1', label: 'Alice' },
        { id: 'u2', label: 'Aaron' },
      ].filter((u) => u.label.toLowerCase().includes(q.toLowerCase())),
    );

  it('does not open a menu when the mentions prop is absent', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 3 },
      focus: { blockId: 'k', offset: 3 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the menu for a trigger context and inserts a chip on Enter', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 5 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @a', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} mentions={{ onQuery: usersQuery }} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    box.focus();
    await user.keyboard('{Enter}');
    // chip inserted: a data-mention span with the active item
    await waitFor(() =>
      expect(box.querySelector('[data-mention-id="u1"]')?.textContent).toBe('@Alice'),
    );
  });
});
```

(Add `waitFor` to the `@testing-library/react` import at the top of the test file.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: FAIL — no `mentions` prop; no listbox.

- [ ] **Step 3: Add imports + the prop**

In `RichTextEditor.tsx`, add imports:

```ts
import { insertText, insertFragment, insertMention } from '../RichText/engine/transforms';
import { useMention } from './useMention';
import { RichTextMentionMenu } from './RichTextMentionMenu';
import type { MentionItem, MentionsConfig } from './mentions';
```

(Replace the existing `insertText, insertFragment` import line with the one above.)

Add to `RichTextEditorProps` (after `toolbar?`):

```ts
  /**
   * Enable `@`-mention autocomplete. Supply `onQuery` to resolve candidates for
   * the text typed after the trigger (default `@`); the editor renders a floating
   * combobox and inserts a styled mention chip carrying the chosen item's `id`.
   * Omit to disable mentions. See {@link MentionsConfig}.
   */
  mentions?: MentionsConfig;
```

Destructure `mentions` in the component signature (alongside `toolbar = false`).

- [ ] **Step 4: Wire the hook** — after the `onRedo` callback (~line 274), add:

```ts
const insertMentionItem = useCallback(
  (blockId: string, range: { from: number; to: number }, trigger: string, item: MentionItem) => {
    commit(insertMention(latest.current.value, blockId, range, trigger, item), 'other');
    clearPendingMarks();
  },
  [commit, clearPendingMarks],
);

const mention = useMention({
  enabled: !!mentions && !readOnly,
  rootRef,
  doc: value,
  trigger: mentions?.trigger ?? '@',
  onQuery: mentions?.onQuery,
  onInsert: insertMentionItem,
});
```

Also harden the pending-mark base: in `marksAtCaretMarks` (line ~88), filter out `mention` so a ⌘B at a chip's edge then typing never re-applies the mention mark to new text:

```ts
if (caret.offset - 1 >= pos && caret.offset - 1 < end)
  return run.marks.filter((m) => m.type !== 'mention');
```

- [ ] **Step 5: Handle menu navigation keys** — in `onKeyDown`, immediately after `const range = readSelection(root); if (!range) return;` (~line 529) and BEFORE the ⌘K branch, insert:

```ts
// Mention menu navigation takes priority over editor keys when open.
if (mention.open && mention.items.length > 0) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    mention.move(1);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    mention.move(-1);
    return;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    mention.commitActive();
    return;
  }
}
if (mention.open && e.key === 'Escape') {
  e.preventDefault();
  e.stopPropagation();
  mention.close();
  return;
}
```

Add `mention` to the `onKeyDown` `useCallback` dependency array.

- [ ] **Step 6: Add combobox ARIA to the editable div** — in the `editable` JSX, after `aria-readonly=…`, add:

```tsx
        aria-haspopup={mentions ? 'listbox' : undefined}
        aria-expanded={mentions ? mention.open : undefined}
        aria-controls={mention.open ? mention.listboxId : undefined}
        aria-activedescendant={mention.open ? mention.activeOptionId : undefined}
```

- [ ] **Step 7: Render the menu** — after the `linkBubble` definition (~line 681), add:

```tsx
const mentionMenu =
  mention.open && !readOnly && mention.anchorRect ? (
    <RichTextMentionMenu
      items={mention.items}
      activeIndex={mention.activeIndex}
      anchorRect={mention.anchorRect}
      listboxId={mention.listboxId}
      getOptionId={mention.getOptionId}
      label={t('richTextEditor.mentionsLabel')}
      emptyLabel={t('richTextEditor.mentionsEmpty')}
      onSelect={mention.selectIndex}
      onHover={mention.setActiveIndex}
    />
  ) : null;
```

Render `{mentionMenu}` alongside `{linkBubble}` in BOTH return branches (the `!toolbar` fragment and the toolbar `div`).

- [ ] **Step 8: Run the editor tests to verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: PASS — both new tests green, all existing editor tests still green.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire mentions (hook, menu, keys, ARIA)"
```

---

## Task 11: Packaging — exports, i18n, JSDoc, AGENTS.md, demo

**Files:**

- Modify: `packages/design-system/src/index.ts:346-347`
- Modify: `packages/design-system/src/i18n/messages.ts:328` + `en.ts:199` + `ru.ts:202`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx` (JSDoc `@remarks`)
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`

- [ ] **Step 1: Export the types from `index.ts`** — after line 347 (`export type { RichTextEditorProps }`):

```ts
export type { MentionItem, MentionsConfig } from './components/RichTextEditor';
```

And in `packages/design-system/src/components/RichTextEditor/index.ts`, re-export them:

```ts
export type { MentionItem, MentionsConfig } from './mentions';
```

(Open that index.ts first; add the line next to the existing `RichTextEditorProps` export.)

- [ ] **Step 2: Add the i18n keys**

`messages.ts` — inside the `richTextEditor` object, after `redo: string;` (line ~327):

```ts
/** Accessible name for the mentions autocomplete listbox. */
mentionsLabel: string;
/** Empty-state row when no mention candidates match. */
mentionsEmpty: string;
```

`en.ts` — after `redo: 'Redo',` (line ~199):

```ts
    mentionsLabel: 'Mentions',
    mentionsEmpty: 'No matches',
```

`ru.ts` — after `redo: 'Повторить',` (line ~203):

```ts
    mentionsLabel: 'Упоминания',
    mentionsEmpty: 'Нет совпадений',
```

- [ ] **Step 3: Run the i18n + typecheck gate**

Run: `cd packages/design-system && npx tsc --noEmit`
Expected: PASS (no missing-key errors — `Messages` is satisfied by both locales).

- [ ] **Step 4: Add JSDoc to the editor** — in the `RichTextEditor` function JSDoc:

Add a line to the main description (after the Markdown-shortcuts sentence):

```
 * Pass `mentions={{ onQuery }}` to enable `@`-mention autocomplete: typing the
 * trigger opens a combobox of candidates and inserts a chip carrying the id.
```

Add an `@example`:

```tsx
 * @example
 * // @-mentions: resolve candidates from your data (sync or async).
 * <RichTextEditor value={doc} onChange={setDoc}
 *   mentions={{ onQuery: (q) => searchUsers(q) }} />
```

Add to the `@remarks Anti-patterns` list:

```
 * - ❌ Using mentions to insert plain links — that's the link tool (⌘K). A
 *   mention chip is an inert reference carrying an `id`, not a navigable anchor.
 * - ❌ Returning thousands of unfiltered items from `onQuery` — filter server-side
 *   (or by the `query`); the menu renders what you return.
 * - ❌ Relying on Markdown to preserve mentions — `toMarkdown` is lossy (plain
 *   `@label`); use `toHtml`/`fromHtml` to round-trip a mention's id.
```

- [ ] **Step 5: Add the AGENTS.md note** — open `packages/design-system/AGENTS.md`, find the `<RichTextEditor>` section, and add a short "Mentions" paragraph:

```md
**Mentions:** pass `mentions={{ onQuery }}` (optional `trigger`, default `@`) to
enable `@`-autocomplete. `onQuery(query)` returns `MentionItem[]` (`{ id, label,
description?, avatarUrl? }`), sync or async. Picking a candidate inserts a chip
carrying the `id`; chips survive `toHtml`/`fromHtml` round-trips but degrade to
plain `@label` text in `toMarkdown`. Chips are inert references, not links.
```

- [ ] **Step 6: Extend the demo** — in `RichTextEditorDemo.tsx`:

Add a mention seed + mock query before the `return`:

```tsx
const [mentionDoc, setMentionDoc] = useState<RichDoc>(() => docFromText('Assign this to '));
const TEAM = [
  { id: 'u1', label: 'Alice Nguyen', description: 'alice@eocrm.dev' },
  { id: 'u2', label: 'Bob Martinez', description: 'bob@eocrm.dev' },
  { id: 'u3', label: 'Carlos Whitfield', description: 'carlos@eocrm.dev' },
  { id: 'u4', label: 'Dana Lee', description: 'dana@eocrm.dev' },
];
const queryTeam = (q: string) =>
  Promise.resolve(TEAM.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())));
```

Add a new `<Example>` (before the Read-only one):

```tsx
<Example
  title="Mentions (@-autocomplete)"
  description='Pass a mentions prop with onQuery to enable @-mentions. Type "@" then a name (e.g. "@al") to open the candidate menu; ↑/↓ to move, Enter/Tab to insert a chip, Esc to dismiss. The chip carries the id; Backspace removes the whole chip.'
  code={`<RichTextEditor value={doc} onChange={setDoc} toolbar
  mentions={{ onQuery: (q) => searchUsers(q) }} />`}
>
  <RichTextEditor
    value={mentionDoc}
    onChange={setMentionDoc}
    toolbar
    placeholder="Type @ to mention someone…"
    mentions={{ onQuery: queryTeam }}
  />
</Example>
```

- [ ] **Step 7: Run the full gates**

Run:

```bash
cd /Users/dpws/projects/design-system && make test && make build-lib && make lint && npm run format:check
```

Expected: all PASS. If `format:check` flags files, run `npx prettier --write` on them and re-stage.

- [ ] **Step 8: Verify the tarball excludes tests (packaging gate)**

Run: `cd /Users/dpws/projects/design-system && npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|CLAUDE\.md|tsconfig'`
Expected: `0`

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/index.ts \
        packages/design-system/src/components/RichTextEditor/index.ts \
        packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts \
        packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx \
        packages/design-system/AGENTS.md \
        packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "feat(RichTextEditor): export mention types, i18n, docs + demo"
```

---

## Task 12: Browser verification (Playwright, manual)

jsdom can't exercise real carets/selection geometry. After the gates are green, start the playground and verify the live flow.

- [ ] **Step 1: Start the playground** — `make dev` (serves http://localhost:8080).
- [ ] **Step 2: Navigate** to `/components/richtexteditor`, the "Mentions" example.
- [ ] **Step 3: Verify the flow** with Playwright (or manually):
  - Type `@` after "Assign this to " → the menu opens, showing all 4 team members.
  - Type `al` → the menu filters to "Alice Nguyen"; the row shows the name + email.
  - Press ↓ then Enter (or click) → a chip `@Alice Nguyen` inserts with a trailing space; the caret lands after the space; typing continues as unmarked text.
  - Press Backspace right after a chip → the WHOLE chip is removed in one step.
  - Press ⌘Z right after inserting a chip → the insertion reverts in one step.
  - Press Escape with the menu open → it closes and nothing is inserted.
  - Confirm the "HTML →" output (if shown) contains `<span data-mention-id="u1" …>@Alice Nguyen</span>`.
- [ ] **Step 4:** Note any glitch (caret jump, double-insert, menu mis-position) and fix before finishing. No commit needed if clean.

---

## Self-review notes (already reconciled)

- **Spec coverage:** model mark (T1); atomicity rule 1 (whole-chip Backspace) + rule 2 (range-delete snap) both fall out of the `deleteRange` snap in T6 (Backspace deletes a 1-char range through `deleteRange`); atomicity rule 3 (typing never extends a chip) is enforced by filtering `mention` from inherited marks in `marksBefore` (T6 Step 3) **and** the editor's `marksAtCaretMarks` pending path (T10) — independent of the trailing space. Rendering+chip (T2), serialization HTML round-trip (T3/T4) + lossy MD (T5), context (T7), hook (T8), menu (T9), wiring+ARIA (T10), packaging+demo (T11).
- **No new component (manifest):** the menu is internal to RichTextEditor — no manifest/overview-grid/`build:manifest` step. Confirmed against the spec's packaging section.
- **Type consistency:** `insertMention(doc, blockId, {from,to}, trigger, {id,label})` is identical in T6 (def), T8 (hook `onInsert`), and T10 (editor `insertMentionItem`). `MentionItem`/`MentionsConfig` defined once in T7 (`mentions.ts`), consumed by T8/T9/T10, exported in T11.
- **Placeholder scan:** no TBD/TODO; every code step ships complete code. Token names in T2/T9 SCSS are verified against `tokens.scss` (T2) or carry an explicit "substitute the equivalent the `.linkBubble` uses, never a raw value" instruction (T9).
