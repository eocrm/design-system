# RichTextEditor — Links slice (Slice 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add create/edit/remove of inline hyperlinks to `<RichTextEditor>` via a selection-anchored floating bubble opened from a toolbar Link button or ⌘K/Ctrl+K.

**Architecture:** Three layers mirroring prior slices — (1) pure link commands in `links.ts` composing the existing engine transforms; (2) a presentational floating bubble `RichTextLinkEditor.tsx` (portal + Floating UI virtual anchor, the `AutocompleteMenu` pattern); (3) editor + toolbar wiring that routes Apply/Remove through the existing `commit({ doc, selection })` path with DOM selection capture/restore. No new engine transforms; no new dependency; no new public export.

**Tech Stack:** TypeScript, React 19, Vitest + React Testing Library (jsdom, `globals: true` — no need to import `describe`/`it`/`expect`/`vi`), `@floating-ui/react-dom`, the in-house RichText engine.

**Spec:** `docs/superpowers/specs/2026-06-18-richtext-editor-links-design.md`

---

## Context the engineer needs

- **The engine is the source of truth.** `links.ts` is pure (no DOM/React) and composes these existing functions:
  - `applyMark(doc, range, mark)` / `removeMark(doc, range, type)` / `insertText(doc, point, text)` from `../RichText/engine/transforms` — each returns `{ doc: RichDoc; selection: Range }`. `applyMark` uses `withMark`, which **replaces** a same-type mark (so re-applying a link updates its href, never stacks).
  - `findBlockIndex(doc, blockId)`, `blockLength(block)`, `isCollapsed(range)` from `../RichText/engine/position`.
  - Types from `../RichText/engine/model`: `RichDoc`, `Range`, `Point`, `Mark`. A link mark is `{ type: 'link'; href: string }`.
- **`commit({ doc, selection })`** (already in `RichTextEditor.tsx`) fires `onChange(doc)` and stashes `selection` to restore after re-render. It **no-ops when `result.doc === value`** (reference-equal), so avoid calling a transform that rebuilds the doc when nothing should change.
- **Vitest globals.** Tests do NOT import `describe`/`it`/`expect`/`vi`. They DO import `render`/`screen` from `@testing-library/react`, `userEvent` from `@testing-library/user-event`, and the unit under test.
- **Floating UI works in jsdom** (proven by `LiquidEditor.test.tsx` rendering `AutocompleteMenu`). `getBoundingClientRect` returns zeros in jsdom; that's fine for the bubble tests.
- **Run a single test file:** `npm test -- src/components/RichTextEditor/<file>` from `packages/design-system/`. Full gate: `make test && make build-lib && make lint && npm run format:check` from the repo root.
- **`structure.test.ts`** only enforces the four-file rule on **top-level** `components/<Name>/` dirs. `links.ts` and `RichTextLinkEditor.tsx` live inside `components/RichTextEditor/`, so they are internal helpers — no separate index export, no four-file rule (same as `RichTextToolbar.tsx`, `selection.ts`, etc.).

## File structure

- **Create** `src/components/RichTextEditor/links.ts` — pure `linkAt` / `setLink` / `removeLink` + `LinkAtResult`.
- **Create** `src/components/RichTextEditor/links.test.ts` — unit tests for the above.
- **Create** `src/components/RichTextEditor/RichTextLinkEditor.tsx` — the floating bubble (presentational).
- **Create** `src/components/RichTextEditor/RichTextLinkEditor.test.tsx` — bubble tests.
- **Modify** `src/components/RichTextEditor/icons.tsx` — add `LinkIcon`.
- **Modify** `src/components/RichTextEditor/RichTextEditor.module.scss` — add `.linkBubble`.
- **Modify** `src/i18n/messages.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts` — six new `richTextEditor` keys.
- **Modify** `src/components/RichTextEditor/RichTextToolbar.tsx` + `RichTextToolbar.test.tsx` — Link button.
- **Modify** `src/components/RichTextEditor/RichTextEditor.tsx` + `RichTextEditor.test.tsx` — wiring + JSDoc.
- **Modify** `packages/playground/src/pages/components/RichTextEditorDemo.tsx` — links example.
- **Modify** `packages/design-system/AGENTS.md` — RichTextEditor TL;DR links note.

---

## Task 1: `links.ts` — `linkAt`

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/links.ts`
- Test: `packages/design-system/src/components/RichTextEditor/links.test.ts`

- [ ] **Step 1: Write the failing test**

Create `links.test.ts`:

```ts
import { linkAt, setLink, removeLink } from './links';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc, Range, Inline } from '../RichText/engine/model';

const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });
const bold = { type: 'bold' as const };
const link = (href: string) => ({ type: 'link' as const, href });

function para(id: string, inlines: Inline[]): RichDoc['blocks'][number] {
  return { id, type: 'paragraph', inlines };
}

describe('linkAt', () => {
  it('caret inside a link → its href + full contiguous extent', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'go ', marks: [] },
          { text: 'home', marks: [link('/home')] },
          { text: ' now', marks: [] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 5))).toEqual({ href: '/home', range: span(at('a', 3), at('a', 7)) });
  });

  it('caret outside any link → null', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'plain', marks: [] }])] };
    expect(linkAt(doc, at('a', 2))).toBeNull();
  });

  it('caret at the link trailing boundary (block end) resolves to the link', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'x', marks: [] },
          { text: 'link', marks: [link('/p')] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 5))).toEqual({ href: '/p', range: span(at('a', 1), at('a', 5)) });
  });

  it('two adjacent links with different hrefs stay separate', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'aa', marks: [link('/1')] },
          { text: 'bb', marks: [link('/2')] },
        ]),
      ],
    };
    expect(linkAt(doc, at('a', 1))).toEqual({ href: '/1', range: span(at('a', 0), at('a', 2)) });
    expect(linkAt(doc, at('a', 3))).toEqual({ href: '/2', range: span(at('a', 2), at('a', 4)) });
  });

  it('caret at offset 0 of a leading non-link run → null', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'hi', marks: [] }])] };
    expect(linkAt(doc, at('a', 0))).toBeNull();
  });

  it('unknown block id → null', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'x', { id: 'a' })] };
    expect(linkAt(doc, at('zzz', 0))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/links.test.ts`
Expected: FAIL — `linkAt`/`setLink`/`removeLink` are not exported (module not found).

- [ ] **Step 3: Write the minimal implementation**

Create `links.ts` (include the full module shell now; `setLink`/`removeLink` bodies arrive in Tasks 2–3, but define stubs so the file imports cleanly):

```ts
// links.ts — pure link commands for <RichTextEditor>. No DOM, no React. Each
// command composes the engine's existing mark/text transforms; `setLink` covers
// the three link cases (selection / caret-in-link / caret-elsewhere). Safety of
// the stored href is enforced at render time by the engine's `safeHref`.
import type { RichDoc, Range, Point, Mark } from '../RichText/engine/model';
import { applyMark, removeMark, insertText } from '../RichText/engine/transforms';
import { findBlockIndex, blockLength, isCollapsed } from '../RichText/engine/position';

/** The link covering a point: its href and the full contiguous same-href range. */
export interface LinkAtResult {
  href: string;
  range: Range;
}

/**
 * The link at a (collapsed) point: its href and the full contiguous run of
 * characters sharing that exact href, or `null` when the point is not in a link.
 * The owning character is the one at `offset`, or the one before it when the
 * caret sits at the block's end (so a caret just after a link still resolves).
 */
export function linkAt(doc: RichDoc, point: Point): LinkAtResult | null {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return null;
  const block = doc.blocks[idx];
  const len = blockLength(block);
  // Per-character link href across the block (null where no link).
  const hrefs: (string | null)[] = [];
  for (const run of block.inlines) {
    const mark = run.marks.find((m) => m.type === 'link');
    const href = mark && mark.type === 'link' ? mark.href : null;
    for (let i = 0; i < run.text.length; i += 1) hrefs.push(href);
  }
  const probe = point.offset < len ? point.offset : point.offset - 1;
  if (probe < 0 || probe >= len) return null;
  const href = hrefs[probe];
  if (href === null) return null;
  let start = probe;
  while (start > 0 && hrefs[start - 1] === href) start -= 1;
  let end = probe + 1;
  while (end < len && hrefs[end] === href) end += 1;
  return {
    href,
    range: {
      anchor: { blockId: block.id, offset: start },
      focus: { blockId: block.id, offset: end },
    },
  };
}

/** Remove the link mark over `range`. (Body in Task 2.) */
export function removeLink(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range } {
  return removeMark(doc, range, 'link');
}

/** Apply / update / insert a link over `range`. (Full body in Task 3.) */
export function setLink(
  doc: RichDoc,
  range: Range,
  href: string,
): { doc: RichDoc; selection: Range } {
  void insertText;
  void applyMark;
  void isCollapsed;
  void linkAt;
  const trimmed = href.trim();
  if (trimmed === '') return { doc, selection: range };
  return applyMark(doc, range, { type: 'link', href: trimmed } as Mark);
}
```

- [ ] **Step 4: Run the test to verify `linkAt` passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/links.test.ts -t linkAt`
Expected: PASS (all `linkAt` cases). The `setLink`/`removeLink` suites don't exist yet.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/links.ts packages/design-system/src/components/RichTextEditor/links.test.ts
git commit -m "feat(RichTextEditor): linkAt — find the link covering a point"
```

---

## Task 2: `links.ts` — `removeLink`

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/links.ts` (already has the one-line body from Task 1's shell)
- Test: `packages/design-system/src/components/RichTextEditor/links.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `links.test.ts`:

```ts
describe('removeLink', () => {
  it('strips the link over the range, keeping other marks', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'hi', marks: [link('/p'), bold] }])] };
    const r = removeLink(doc, span(at('a', 0), at('a', 2)));
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'hi', marks: [bold] }]);
    expect(r.selection).toEqual(span(at('a', 0), at('a', 2)));
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/links.test.ts -t removeLink`
Expected: PASS — `removeLink` already delegates to `removeMark(doc, range, 'link')`, whose `selection` is the input range, and `withoutMark` preserves the surviving `bold`.

(If it fails, the shell body from Task 1 is wrong — it must be exactly `return removeMark(doc, range, 'link');`.)

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/links.test.ts
git commit -m "test(RichTextEditor): removeLink strips link, keeps other marks"
```

---

## Task 3: `links.ts` — `setLink` (three cases + empty href)

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/links.ts`
- Test: `packages/design-system/src/components/RichTextEditor/links.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `links.test.ts`:

```ts
describe('setLink', () => {
  it('case 1 — non-collapsed selection gets the link mark', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 0), at('a', 4)), '/p');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [link('/p')] }]);
    expect(r.selection).toEqual(span(at('a', 0), at('a', 4)));
  });

  it('case 1 — re-applying replaces the href (no stacking)', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'abcd', marks: [link('/old')] }])] };
    const r = setLink(doc, span(at('a', 0), at('a', 4)), '/new');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abcd', marks: [link('/new')] }]);
  });

  it('case 2 — collapsed caret in a link re-links its full extent', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'go ', marks: [] },
          { text: 'home', marks: [link('/old')] },
        ]),
      ],
    };
    const r = setLink(doc, span(at('a', 5), at('a', 5)), '/new');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'go ', marks: [] },
      { text: 'home', marks: [link('/new')] },
    ]);
    expect(r.selection).toEqual(span(at('a', 3), at('a', 7)));
  });

  it('case 3 — collapsed caret elsewhere inserts the href as linked text', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'go ', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 3), at('a', 3)), '/p');
    expect(r.doc.blocks[0].inlines).toEqual([
      { text: 'go ', marks: [] },
      { text: '/p', marks: [link('/p')] },
    ]);
    expect(r.selection).toEqual(span(at('a', 3), at('a', 5)));
  });

  it('empty href — removes an existing link at a collapsed caret', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'home', marks: [link('/p')] }])] };
    const r = setLink(doc, span(at('a', 2), at('a', 2)), '  ');
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'home', marks: [] }]);
  });

  it('empty href — no-op when there is nothing to link', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'plain', { id: 'a' })] };
    const r = setLink(doc, span(at('a', 2), at('a', 2)), '');
    expect(r.doc).toBe(doc);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/links.test.ts -t setLink`
Expected: FAIL — the Task-1 stub only handles case 1 and the trivial empty no-op; cases 2/3 and empty-removal fail.

- [ ] **Step 3: Replace the `setLink` body**

In `links.ts`, replace the entire `setLink` function (and delete the `void …` lines) with:

```ts
/**
 * Apply, update, or insert a link over `range`. Three cases, decided by
 * `isCollapsed` + `linkAt`:
 * 1. Non-collapsed selection → link it (replacing any existing href).
 * 2. Collapsed caret inside a link → re-link the link's full extent.
 * 3. Collapsed caret elsewhere → insert the href as linked text.
 * An empty/whitespace href removes an existing link (cases 1–2) or is a no-op
 * (case 3). `href` is trimmed but otherwise stored verbatim — `safeHref`
 * sanitizes at render time. Returns the `{ doc, selection }` commit payload.
 */
export function setLink(
  doc: RichDoc,
  range: Range,
  href: string,
): { doc: RichDoc; selection: Range } {
  const trimmed = href.trim();
  const collapsed = isCollapsed(range);

  if (trimmed === '') {
    if (!collapsed) return removeLink(doc, range);
    const existing = linkAt(doc, range.anchor);
    return existing ? removeLink(doc, existing.range) : { doc, selection: range };
  }

  const mark: Mark = { type: 'link', href: trimmed };

  // Case 1 — selection.
  if (!collapsed) return applyMark(doc, range, mark);

  // Case 2 — caret inside an existing link.
  const existing = linkAt(doc, range.anchor);
  if (existing) return applyMark(doc, existing.range, mark);

  // Case 3 — caret elsewhere: insert the href, then link the inserted span.
  const inserted = insertText(doc, range.anchor, trimmed);
  const linkedSpan: Range = {
    anchor: range.anchor,
    focus: { blockId: range.anchor.blockId, offset: range.anchor.offset + trimmed.length },
  };
  return applyMark(inserted.doc, linkedSpan, mark);
}
```

- [ ] **Step 4: Run the full links suite to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/links.test.ts`
Expected: PASS (all `linkAt` + `removeLink` + `setLink` cases).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/links.ts packages/design-system/src/components/RichTextEditor/links.test.ts
git commit -m "feat(RichTextEditor): setLink — selection / in-link / insert cases + empty-href removal"
```

---

## Task 4: i18n keys + `LinkIcon`

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`
- Modify: `packages/design-system/src/components/RichTextEditor/icons.tsx`

- [ ] **Step 1: Add the keys to the `Messages` interface**

In `messages.ts`, inside the `richTextEditor: { … }` block, after the `orderedList: string;` line, add:

```ts
/** aria-label on the toolbar Link button. */
link: string;
/** Label (aria) for the URL field in the link bubble. */
linkUrl: string;
/** Placeholder for the URL field in the link bubble. */
linkUrlPlaceholder: string;
/** Apply button in the link bubble. */
linkApply: string;
/** Remove-link button in the link bubble (shown when editing a link). */
linkRemove: string;
/** Accessible name for the link bubble's form group. */
linkEditorLabel: string;
```

- [ ] **Step 2: Add the English values**

In `en.ts`, inside `richTextEditor: { … }`, after `orderedList: 'Numbered list',` add:

```ts
    link: 'Link',
    linkUrl: 'Link URL',
    linkUrlPlaceholder: 'https://… or /path',
    linkApply: 'Apply',
    linkRemove: 'Remove link',
    linkEditorLabel: 'Edit link',
```

- [ ] **Step 3: Add the Russian values**

In `ru.ts`, inside `richTextEditor: { … }`, after `orderedList: 'Нумерованный список',` add:

```ts
    link: 'Ссылка',
    linkUrl: 'URL ссылки',
    linkUrlPlaceholder: 'https://… или /path',
    linkApply: 'Применить',
    linkRemove: 'Удалить ссылку',
    linkEditorLabel: 'Редактирование ссылки',
```

- [ ] **Step 4: Add `LinkIcon`**

In `icons.tsx`, after the `OrderedListIcon` function, add:

```tsx
export function LinkIcon() {
  return (
    <svg {...base}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41" />
    </svg>
  );
}
```

- [ ] **Step 5: Verify typecheck + i18n format test pass**

Run: `cd packages/design-system && npm run typecheck && npm test -- src/i18n/format.test.ts`
Expected: PASS — `en`/`ru` satisfy the extended `Messages` type (a missing key would be a typecheck error).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): i18n keys + LinkIcon for link editing"
```

---

## Task 5: `RichTextLinkEditor.tsx` — the floating bubble

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/RichTextLinkEditor.tsx`
- Create: `packages/design-system/src/components/RichTextEditor/RichTextLinkEditor.test.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`

- [ ] **Step 1: Write the failing test**

Create `RichTextLinkEditor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextLinkEditor } from './RichTextLinkEditor';
import { I18nProvider } from '../../i18n';

function renderBubble(props: Partial<React.ComponentProps<typeof RichTextLinkEditor>> = {}) {
  const onApply = vi.fn();
  const onRemove = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextLinkEditor
        href=""
        editing={false}
        anchorRect={{ top: 0, left: 0, width: 0, height: 0 }}
        onApply={onApply}
        onRemove={onRemove}
        onCancel={onCancel}
        {...props}
      />
    </I18nProvider>,
  );
  return { onApply, onRemove, onCancel };
}

describe('RichTextLinkEditor', () => {
  it('renders a URL field and Apply, no Remove when creating', () => {
    renderBubble();
    expect(screen.getByRole('textbox', { name: 'Link URL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove link' })).not.toBeInTheDocument();
  });

  it('shows Remove and pre-fills the href when editing', () => {
    renderBubble({ editing: true, href: 'https://x.test' });
    expect(screen.getByRole('textbox', { name: 'Link URL' })).toHaveValue('https://x.test');
    expect(screen.getByRole('button', { name: 'Remove link' })).toBeInTheDocument();
  });

  it('Enter applies the trimmed URL', async () => {
    const user = userEvent.setup();
    const { onApply } = renderBubble();
    await user.type(screen.getByRole('textbox', { name: 'Link URL' }), '  /docs  {Enter}');
    expect(onApply).toHaveBeenCalledWith('/docs');
  });

  it('Escape cancels', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderBubble();
    await user.type(screen.getByRole('textbox', { name: 'Link URL' }), '{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('Remove fires onRemove', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderBubble({ editing: true, href: '/p' });
    await user.click(screen.getByRole('button', { name: 'Remove link' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('the bubble is a labelled group', () => {
    renderBubble();
    expect(screen.getByRole('group', { name: 'Edit link' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextLinkEditor.test.tsx`
Expected: FAIL — `RichTextLinkEditor` module not found.

- [ ] **Step 3: Create the bubble**

Create `RichTextLinkEditor.tsx`:

```tsx
// RichTextLinkEditor.tsx — the floating link-edit bubble for <RichTextEditor>.
// Presentational: the editor owns all state and passes the current href + the
// selection rect; this renders the URL form and positions it at the rect via a
// Floating UI virtual element (the same portal+virtual-anchor pattern as
// LiquidEditor's AutocompleteMenu, so it escapes the editor's overflow and any
// Drawer/Modal ancestor). Enter applies, Esc / click-outside cancels.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import styles from './RichTextEditor.module.scss';

export interface RichTextLinkEditorProps {
  /** Initial URL value (empty when creating). */
  href: string;
  /** Whether an existing link is being edited (shows the Remove button). */
  editing: boolean;
  /** Selection rect (viewport coords) the bubble anchors to. */
  anchorRect: { top: number; left: number; height: number; width: number };
  /** Apply the (trimmed) URL. */
  onApply: (href: string) => void;
  /** Remove the link (only reachable when `editing`). */
  onRemove: () => void;
  /** Dismiss without changes (Esc / click-outside). */
  onCancel: () => void;
}

/**
 * Internal floating bubble for editing a link's URL. Rendered by
 * `<RichTextEditor>` when the link editor is open; not exported from the
 * package. Remount it (via `key`) per open so the URL field re-seeds from `href`.
 */
export function RichTextLinkEditor({
  href,
  editing,
  anchorRect,
  onApply,
  onRemove,
  onCancel,
}: RichTextLinkEditorProps) {
  const t = useTranslation();
  const [value, setValue] = useState(href);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Floating UI virtual element — only `getBoundingClientRect` is required.
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
    middleware: [offset(6), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });

  // Focus the URL field on open; select its contents when editing so a re-type
  // replaces the existing href.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (editing) input.select();
  }, [editing]);

  // Dismiss on a pointerdown outside the bubble.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onCancel]);

  const setRefs = (node: HTMLDivElement | null) => {
    bubbleRef.current = node;
    refs.setFloating(node);
  };

  return createPortal(
    <div
      ref={setRefs}
      className={styles.linkBubble}
      style={floatingStyles}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <form
        role="group"
        aria-label={t('richTextEditor.linkEditorLabel')}
        onSubmit={(e) => {
          e.preventDefault();
          onApply(value.trim());
        }}
      >
        <Stack gap="xs">
          <Cluster gap="xs">
            <Input
              ref={inputRef}
              size="sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t('richTextEditor.linkUrl')}
              placeholder={t('richTextEditor.linkUrlPlaceholder')}
            />
            <Button type="submit" size="sm" variant="primary">
              {t('richTextEditor.linkApply')}
            </Button>
          </Cluster>
          {editing ? (
            <Button type="button" size="sm" variant="danger" onClick={onRemove}>
              {t('richTextEditor.linkRemove')}
            </Button>
          ) : null}
        </Stack>
      </form>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Add the bubble styles**

In `RichTextEditor.module.scss`, append at the end:

```scss
// The floating link-edit bubble (RichTextLinkEditor). A portaled overlay
// positioned by Floating UI's inline `floatingStyles` (so `position`/offsets are
// NOT set here). `min-width` is the established sizing convention for floating
// overlays (cf. LiquidEditor's `.menu`), not page layout — Rule 4 targets
// in-flow component layout, not a portaled popover's intrinsic size.
.linkBubble {
  z-index: var(--z-overlay-floating);
  min-width: var(--size-dropdown-min-width);
  padding: var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  box-shadow: var(--shadow-lg);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextLinkEditor.test.tsx`
Expected: PASS (all six cases).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextLinkEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextLinkEditor.test.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "feat(RichTextEditor): RichTextLinkEditor floating link bubble"
```

---

## Task 6: Toolbar Link button

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `RichTextToolbar.test.tsx`, first update the `renderTb` helper so the new required prop has a default. Replace the existing helper with:

```tsx
function renderTb(props: Partial<React.ComponentProps<typeof RichTextToolbar>> = {}) {
  const onToggleMark = vi.fn();
  const onSetBlock = vi.fn();
  const onToggleList = vi.fn();
  const onOpenLink = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextToolbar
        activeMarks={[]}
        block={{ type: 'paragraph' }}
        onToggleMark={onToggleMark}
        onSetBlock={onSetBlock}
        onToggleList={onToggleList}
        onOpenLink={onOpenLink}
        {...props}
      />
    </I18nProvider>,
  );
  return { onToggleMark, onSetBlock, onToggleList, onOpenLink };
}
```

Then add these tests inside `describe('RichTextToolbar', …)`:

```tsx
it('renders a Link button', () => {
  renderTb();
  expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
});

it('reflects linkActive via aria-pressed', () => {
  renderTb({ linkActive: true });
  expect(screen.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true');
});

it('fires onOpenLink when the Link button is clicked', async () => {
  const user = userEvent.setup();
  const { onOpenLink } = renderTb();
  await user.click(screen.getByRole('button', { name: 'Link' }));
  expect(onOpenLink).toHaveBeenCalled();
});

it('disables the Link button when disabled', () => {
  renderTb({ disabled: true });
  expect(screen.getByRole('button', { name: 'Link' })).toBeDisabled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextToolbar.test.tsx`
Expected: FAIL — no Link button; `onOpenLink`/`linkActive` props don't exist (TS error in the test) and `getByRole('button', { name: 'Link' })` throws.

- [ ] **Step 3: Add the Link button to the toolbar**

In `RichTextToolbar.tsx`:

1. Extend the icon import (add `LinkIcon`):

```tsx
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  BulletListIcon,
  OrderedListIcon,
  LinkIcon,
} from './icons';
```

2. Add two props to `RichTextToolbarProps` (after `onToggleList`):

```tsx
  /** Whether the current selection sits inside a link (drives the Link button's pressed state). */
  linkActive?: boolean;
  /** Open the link editor for the current selection. */
  onOpenLink: () => void;
```

3. Destructure them in the function signature (add `linkActive = false, onOpenLink`):

```tsx
export function RichTextToolbar({
  activeMarks,
  block,
  disabled,
  onToggleMark,
  onSetBlock,
  onToggleList,
  linkActive = false,
  onOpenLink,
}: RichTextToolbarProps) {
```

4. Render the Link button immediately after the `{MARKS.map(…)}` block and before the second `<span className={styles.toolbarSep} … />` (so it joins the inline-formatting group, then the existing separator divides it from the list toggles):

```tsx
<Button
  size="sm"
  variant={linkActive ? 'secondary' : 'ghost'}
  iconOnly
  aria-label={t('richTextEditor.link')}
  aria-pressed={linkActive}
  disabled={disabled}
  // Preserve the editor's DOM selection (a mousedown that moves focus out
  // of the contentEditable would collapse it before the bubble opens).
  onMouseDown={(e) => e.preventDefault()}
  onClick={onOpenLink}
>
  <LinkIcon />
</Button>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextToolbar.test.tsx`
Expected: PASS (existing toolbar tests + the four new Link tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx packages/design-system/src/components/RichTextEditor/RichTextToolbar.test.tsx
git commit -m "feat(RichTextEditor): toolbar Link button (linkActive + onOpenLink)"
```

---

## Task 7: Editor wiring — open-state, ⌘K, Apply/Remove/Cancel

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `RichTextEditor.test.tsx` (inside its top-level `describe`). This is a render/wiring smoke test — the full caret-driven link flows are browser-verified in Step 6:

```tsx
it('renders the toolbar Link button when the toolbar is on', () => {
  function Harness() {
    const [doc, setDoc] = useState(docFromText('hello'));
    return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
  }
  render(
    <I18nProvider locale="en">
      <Harness />
    </I18nProvider>,
  );
  expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
});

it('opening the link editor from the toolbar shows the link bubble', async () => {
  const user = userEvent.setup();
  function Harness() {
    const [doc, setDoc] = useState(docFromText('hello'));
    return <RichTextEditor value={doc} onChange={setDoc} toolbar autoFocus />;
  }
  render(
    <I18nProvider locale="en">
      <Harness />
    </I18nProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Link' }));
  expect(await screen.findByRole('group', { name: 'Edit link' })).toBeInTheDocument();
});
```

Ensure the test file imports are present at the top (add any missing): `useState` from `react`, `render`/`screen` from `@testing-library/react`, `userEvent`, `RichTextEditor`, `docFromText` (from `../RichText/engine/model`), and `I18nProvider` from `../../i18n`.

Note on the second test: `autoFocus` puts the caret in the editor so `readSelection` resolves; clicking the Link button (whose `onMouseDown` is prevented) keeps that selection, and `openLinkEditor` opens the bubble. If jsdom's `getSelection` returns no range for the click path, the bubble still opens because the editor falls back to the root rect and a collapsed range at the caret — see the implementation's `selectionRect`/`openLinkEditor`. If this specific assertion proves flaky under jsdom's limited selection support, keep the first test (the hard wiring guarantee) and move the open-bubble assertion to the Playwright checks in Step 6, leaving a one-line comment why.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: FAIL — toolbar renders no Link button wiring yet (the `RichTextToolbar` is rendered without `onOpenLink`, a TS error) and no bubble appears.

- [ ] **Step 3: Wire the editor**

In `RichTextEditor.tsx`:

1. Extend imports:

```tsx
import { linkAt, setLink, removeLink } from './links';
import { RichTextLinkEditor } from './RichTextLinkEditor';
```

2. Add a rect type + helper near the top of the file (after the existing `marksAtCaretMarks` helper, module scope):

```tsx
type Rect = { top: number; left: number; height: number; width: number };

/** The viewport rect of the current DOM selection, falling back to the editor root. */
function selectionRect(root: HTMLElement): Rect {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (r.width || r.height || r.top || r.left) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  const rr = root.getBoundingClientRect();
  return { top: rr.top, left: rr.left, width: 0, height: rr.height };
}
```

3. Inside the component, add link-editor state + a remount key (place near the other `useState`/`useRef` hooks):

```tsx
interface LinkEditorOpen {
  range: Range;
  href: string;
  editing: boolean;
  anchorRect: Rect;
  key: number;
}
const [linkEditor, setLinkEditor] = useState<LinkEditorOpen | null>(null);
const linkKeyRef = useRef(0);
```

4. Add the open + apply/remove/cancel callbacks (place after `stageOrToggleMark`):

```tsx
// Open the link editor for the live selection: edit the link under the caret
// if there is one (href pre-filled, Remove available), else create over the
// selection (or insert at a collapsed caret on Apply).
const openLinkEditor = useCallback(() => {
  if (latest.current.readOnly) return;
  const root = rootRef.current;
  if (!root) return;
  const range = readSelection(root);
  if (!range) return;
  const existing = linkAt(latest.current.value, range.focus);
  const anchorRect = selectionRect(root);
  linkKeyRef.current += 1;
  setLinkEditor(
    existing
      ? {
          range: existing.range,
          href: existing.href,
          editing: true,
          anchorRect,
          key: linkKeyRef.current,
        }
      : { range, href: '', editing: false, anchorRect, key: linkKeyRef.current },
  );
}, []);

const onLinkApply = useCallback(
  (href: string) => {
    const le = linkEditor;
    if (!le) return;
    const trimmed = href.trim();
    if (trimmed !== '') {
      commit(setLink(latest.current.value, le.range, trimmed));
    } else if (le.editing) {
      commit(removeLink(latest.current.value, le.range));
    }
    // empty href while creating → just close (cancel).
    setLinkEditor(null);
    rootRef.current?.focus();
  },
  [linkEditor, commit],
);

const onLinkRemove = useCallback(() => {
  const le = linkEditor;
  if (!le) return;
  commit(removeLink(latest.current.value, le.range));
  setLinkEditor(null);
  rootRef.current?.focus();
}, [linkEditor, commit]);

const onLinkCancel = useCallback(() => {
  const le = linkEditor;
  setLinkEditor(null);
  const root = rootRef.current;
  if (root && le) writeSelection(root, le.range);
  root?.focus();
}, [linkEditor]);
```

5. Add the ⌘K branch to `onKeyDown` — insert it right after the `if (!range) return;` guard, before the Tab branch:

```tsx
// ⌘/Ctrl+K opens the link editor (create or edit a link).
if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
  e.preventDefault();
  openLinkEditor();
  return;
}
```

Then add `openLinkEditor` to the `onKeyDown` `useCallback` dependency array (it becomes `[value, readOnly, commit, stageOrToggleMark, openLinkEditor]`).

6. Add the derived `linkActive` (place with the other `useMemo`s):

```tsx
const toolbarLinkActive = useMemo<boolean>(
  () => (selection ? linkAt(value, selection.focus) != null : false),
  [value, selection],
);
```

7. Render the bubble and pass the toolbar props. Replace the component's `return` tail (from `const editable = (` onward is unchanged; change only the final `if (!toolbar) return editable;` block) with:

```tsx
const linkBubble =
  linkEditor && !readOnly ? (
    <RichTextLinkEditor
      key={linkEditor.key}
      href={linkEditor.href}
      editing={linkEditor.editing}
      anchorRect={linkEditor.anchorRect}
      onApply={onLinkApply}
      onRemove={onLinkRemove}
      onCancel={onLinkCancel}
    />
  ) : null;

if (!toolbar) {
  return (
    <>
      {editable}
      {linkBubble}
    </>
  );
}
return (
  <div className={styles.shell}>
    <RichTextToolbar
      activeMarks={toolbarMarks}
      block={toolbarBlock}
      disabled={readOnly}
      onToggleMark={onToolbarMark}
      onSetBlock={onToolbarSetBlock}
      onToggleList={onToolbarToggleList}
      linkActive={toolbarLinkActive}
      onOpenLink={openLinkEditor}
    />
    {editable}
    {linkBubble}
  </div>
);
```

- [ ] **Step 4: Run the editor tests to verify they pass**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx`
Expected: PASS — the first new test always; the second per its note (move to Playwright if jsdom selection makes it flaky).

- [ ] **Step 5: Run the full RichTextEditor suite + typecheck**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor && npm run typecheck`
Expected: PASS — no regressions across `links`, `RichTextLinkEditor`, `RichTextToolbar`, `RichTextEditor`, `commands`, `selection`, `input`, `shortcuts`.

- [ ] **Step 6: Manual browser verification (Playwright) — the caret/selection flows jsdom can't cover**

Start the playground (`make dev` from repo root), open the RichTextEditor demo, and verify:

1. Select a word → ⌘K → type `https://example.com` → Enter → the word becomes an `<a href="https://example.com">`; selection restored over the link.
2. Put the caret inside that link → click the toolbar Link button → URL pre-filled, Remove shown → change to `/docs` → Apply → href updated across the whole link.
3. Caret in the link → open → Remove → link gone, text kept.
4. Caret in an empty spot / end of text (no selection) → ⌘K → type `/pricing` → Enter → `/pricing` inserted as linked text.
5. Open the bubble → Esc and click-outside both close it with no model change; the editor selection is restored.
6. Paste/enter a `javascript:alert(1)` href → Apply → the rendered `<a>` has no dangerous `href` (the engine's `safeHref` drops it).

Record the outcomes in the PR description.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire link bubble — ⌘K, toolbar button, apply/remove/cancel"
```

---

## Task 8: Demo + JSDoc + AGENTS.md

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx` (JSDoc only)
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a links example to the demo**

In `RichTextEditorDemo.tsx`:

1. Add a second editor state below the existing `doc` state:

```tsx
const [linkDoc, setLinkDoc] = useState<RichDoc>(docFromText('Read the docs and visit our site.'));
```

2. Add a new `<Example>` after the "Editable with toolbar" example and before "Read-only":

```tsx
<Example
  title="Links"
  description="Select text and press ⌘/Ctrl+K (or the toolbar link button) to open the link editor; type a URL and Apply. With the caret inside a link the URL is pre-filled and Remove appears. With no selection, the URL is inserted as linked text. Esc or a click outside cancels."
  code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} toolbar />`}
>
  <RichTextEditor
    value={linkDoc}
    onChange={setLinkDoc}
    toolbar
    placeholder="Select text, then ⌘K…"
  />
</Example>
```

- [ ] **Step 2: Verify the playground builds**

Run: `cd /Users/dpws/projects/design-system && make build-lib && npm run typecheck --workspace playground`
Expected: PASS (typecheck of both packages).

- [ ] **Step 3: Update the component JSDoc (`RichTextEditor.tsx`)**

1. In the main description paragraph (the function's leading JSDoc), add a sentence about links. Change the sentence that currently reads `… Pass \`toolbar\` for the built-in formatting toolbar.` to:

```
 * built-in formatting toolbar. ⌘/Ctrl+K (or the toolbar link button) opens a
 * floating editor to add, edit, or remove a link on the selection.
```

2. In the `@remarks Anti-patterns` block, replace the line:

```
 * - ❌ Expecting links / undo — not in this slice; use the keyboard shortcuts or
 *   `toolbar` for marks/blocks/lists and Enter/Backspace for structure.
```

with:

```
 * - ❌ Expecting undo/redo — not in this slice.
 * - ❌ Hand-rolling a link UI by reaching into the DOM — press ⌘/Ctrl+K or the
 *   toolbar link button; both open the built-in editor and route through the
 *   controlled `value`/`onChange` round-trip.
```

- [ ] **Step 4: Update `AGENTS.md`**

In `packages/design-system/AGENTS.md`, in the `### <RichTextEditor>` section:

1. In the toolbar bullet list (after the "List toggles" bullet), add:

```markdown
- **Link button** — add/edit a link on the selection. Reflects `aria-pressed` when the caret is inside a link.
```

2. After the "Pending marks:" paragraph, add a new paragraph:

```markdown
**Links:** select text and press ⌘/Ctrl+K (or the toolbar link button) to add or edit a link; with the caret inside a link the URL is pre-filled and a Remove button appears; with no selection the URL is inserted as linked text. Esc / click-outside cancels. Stored hrefs are sanitized at render time (`safeHref` blocks `javascript:`/`data:`/protocol-relative).
```

3. In the "When NOT to use:" line, change `No links or undo yet (later slices).` to `No undo/redo yet (later slice).`

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(RichTextEditor): links demo example, JSDoc + AGENTS.md notes"
```

---

## Final gate (before the Rule-8 review loop + PR)

Run from the repo root:

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all gates green; the `npm pack` grep prints `0` (no test files / internal-only paths in the tarball). Then run the library **Hard-rule-8** review-fix loop (fresh-context reviewers across correctness/types, tests, a11y, API/packaging) before pushing.

---

## Self-review (plan vs. spec)

**Spec coverage:**

- `links.ts` `linkAt` / `setLink` (3 cases + empty) / `removeLink` → Tasks 1–3. ✔
- `RichTextLinkEditor.tsx` (portal + virtual anchor + Input/Button, Enter/Esc/click-outside, autofocus) → Task 5. ✔
- Toolbar Link button (`linkActive` aria-pressed, `onOpenLink`, disabled, mousedown-prevent) → Task 6. ✔
- Editor wiring (`linkEditor` state, ⌘K, openLinkEditor target logic, apply/remove/cancel, selection capture/restore, render bubble in both toolbar/non-toolbar paths) → Task 7. ✔
- Six i18n keys in all three files + `LinkIcon` → Task 4. ✔
- Bubble SCSS (tokens-only, layout-free except the floating-overlay `min-width` precedent) → Task 5 Step 4. ✔
- Packaging: no new export/manifest/demo-page (internal); extend existing demo; JSDoc `@remarks`; AGENTS.md → Tasks 7–8. ✔
- href safety via render-time `safeHref` (no second sanitizer) → relied on in Task 3 + verified in Task 7 Step 6.6. ✔

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has an expected result. ✔

**Type consistency:** `LinkAtResult { href; range }`, `setLink`/`removeLink` returning `{ doc; selection }`, the `{ top; left; height; width }` `anchorRect`/`Rect` shape, and the toolbar `linkActive?`/`onOpenLink` props are used identically across Tasks 1, 5, 6, 7. The editor's `LinkEditorOpen` carries `range/href/editing/anchorRect/key`, all consumed by the `RichTextLinkEditor` props it spreads. ✔
