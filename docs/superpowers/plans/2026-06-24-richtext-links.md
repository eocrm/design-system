# RichText links (autolink + `renderLink`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add **autolink** (editor turns typed/pasted URLs into `link` marks) and **`renderLink`** (consumer render-prop that substitutes a link's rendering with a custom block, in the read-only `<RichText>` viewer AND as a non-editable atomic chip inside `<RichTextEditor>`) to `@eocrm/design-system`, per `docs/superpowers/specs/2026-06-24-richtext-links-design.md`.

**Architecture:** Pure engine helpers (`autolink.ts`) + a `renderLink` option threaded through `renderDoc` + widget-aware `selection.ts` (so an editor chip whose display text differs from the model URL maps correctly) + editor hooks (type rule, paste, atomic delete). The model is unchanged (links stay `{type:'link',href}` marks); `renderLink` is render-time only.

**Tech Stack:** TypeScript, React, the in-house rich-text engine, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-24-richtext-links-design.md`

---

## File map

Library (`packages/design-system/`):

- `src/components/RichText/engine/autolink.ts` (new) — pure URL detection + linkify.
- `src/components/RichText/engine/renderLink.ts` (new) — shared `RichTextLink` / `RenderLink` types.
- `src/components/RichText/engine/renderDoc.tsx` (modify) — `renderLink` option + atomic widget.
- `src/components/RichTextEditor/selection.ts` (modify) — widget-aware DOM↔model mapping.
- `src/components/RichTextEditor/autolinkInput.ts` (new) — pure type-rule + atomic-delete helpers.
- `src/components/RichTextEditor/RichTextEditor.tsx` (modify) — props + beforeinput/paste hooks.
- `src/components/RichText/RichText.tsx` (modify) — `renderLink` prop.
- `src/index.ts` (modify) — export `RichTextLink` / `RenderLink`.
- `AGENTS.md` (modify).
- (+ the `*.test.ts(x)` beside each.)

Playground (`packages/playground/`):

- `src/pages/components/RichTextEditorDemo.tsx` + `RichTextDemo.tsx` (modify) — `renderLink` + autolink examples.

---

## Task 1: `autolink.ts` engine helper (pure, TDD)

**Files:** Create `src/components/RichText/engine/autolink.ts` + `autolink.test.ts`.

- [ ] **Step 1: Write `autolink.test.ts`**

```ts
import { findUrl, linkifyRuns } from './autolink';

describe('findUrl', () => {
  it('finds an http(s) URL ending at the caret', () => {
    expect(findUrl('see https://a.com/x')).toEqual({ start: 4, end: 19, href: 'https://a.com/x' });
  });
  it('normalizes a bare www. host to https', () => {
    expect(findUrl('go www.a.com')).toEqual({ start: 3, end: 12, href: 'https://www.a.com' });
  });
  it('excludes trailing sentence punctuation', () => {
    expect(findUrl('see https://a.com.')).toEqual({ start: 4, end: 17, href: 'https://a.com' });
    expect(findUrl('(https://a.com)')).toEqual({ start: 1, end: 14, href: 'https://a.com' });
  });
  it('returns null when the text does not end in a URL', () => {
    expect(findUrl('just words')).toBeNull();
    expect(findUrl('https://a.com then more')).toBeNull(); // URL not at the end
  });
  it('rejects unsafe schemes', () => {
    expect(findUrl('x javascript:alert(1)')).toBeNull();
  });
});

describe('linkifyRuns', () => {
  it('splits a string into plain + link runs', () => {
    expect(linkifyRuns('a https://b.com c')).toEqual([
      { text: 'a ', marks: [] },
      { text: 'https://b.com', marks: [{ type: 'link', href: 'https://b.com' }] },
      { text: ' c', marks: [] },
    ]);
  });
  it('returns a single plain run when there is no URL', () => {
    expect(linkifyRuns('no urls here')).toEqual([{ text: 'no urls here', marks: [] }]);
  });
  it('drops unsafe URLs (leaves them as plain text)', () => {
    expect(linkifyRuns('javascript:alert(1)')).toEqual([
      { text: 'javascript:alert(1)', marks: [] },
    ]);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`cd packages/design-system && npx vitest run src/components/RichText/engine/autolink.test.ts`).

- [ ] **Step 3: Implement `autolink.ts`**

```ts
// autolink.ts — pure URL detection for the editor's autolink (type + paste) and
// the RichText importer. No DOM. hrefs pass through safeHref so only safe schemes
// become links.
import type { Inline } from './model';
import { safeHref } from './safeHref';

// http(s)://… or a bare www.… host. Kept deliberately conservative.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()[\]]+/gi;
// Strip trailing sentence punctuation that is unlikely to be part of the URL.
const TRAILING = /[.,;:!?'"]+$/;

function normalize(raw: string): { url: string; href: string } | null {
  let url = raw.replace(TRAILING, '');
  // Drop an unmatched closing bracket/paren (e.g. "(https://a.com)").
  if (/[)\]]$/.test(url) && !/[([]/.test(url)) url = url.slice(0, -1);
  if (url === '') return null;
  const candidate = url.startsWith('www.') ? `https://${url}` : url;
  const safe = safeHref(candidate);
  if (!safe || !/^https?:/i.test(safe)) return null;
  return { url, href: safe };
}

/** The URL that ends exactly at the end of `text`, or null. (For the type rule:
 *  the caller passes the text up to the caret.) */
export function findUrl(text: string): { start: number; end: number; href: string } | null {
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let last: { start: number; end: number; href: string } | null = null;
  while ((m = URL_RE.exec(text)) !== null) {
    const norm = normalize(m[0]);
    if (!norm) continue;
    const start = m.index;
    const end = start + norm.url.length;
    last = { start, end, href: norm.href };
  }
  // Only return when the matched URL reaches the end of `text`.
  return last && last.end === text.length ? last : null;
}

/** Split `text` into plain + link runs (for paste / import). */
export function linkifyRuns(text: string): Inline[] {
  const runs: Inline[] = [];
  let i = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const norm = normalize(m[0]);
    if (!norm) continue;
    const start = m.index;
    if (start > i) runs.push({ text: text.slice(i, start), marks: [] });
    runs.push({ text: norm.url, marks: [{ type: 'link', href: norm.href }] });
    i = start + norm.url.length;
  }
  if (i < text.length) runs.push({ text: text.slice(i), marks: [] });
  return runs.length ? runs : [{ text, marks: [] }];
}
```

- [ ] **Step 4: Run → PASS.** Adjust the regex/normalize against the test cases until green (the test is the spec — the punctuation/bracket edge cases must pass).

- [ ] **Step 5: Commit** — `git commit -m "feat(RichText): autolink URL detection engine helper"`.

---

## Task 2: `renderLink` types + `renderDoc` threading (TDD)

**Files:** Create `src/components/RichText/engine/renderLink.ts`; modify `renderDoc.tsx`; extend `renderDoc.test.tsx`.

- [ ] **Step 1: Create `renderLink.ts`**

```ts
import type { ReactNode } from 'react';

/** A link encountered while rendering, passed to `renderLink`. */
export interface RichTextLink {
  /** The sanitized URL. */
  href: string;
  /** The link's visible text in the document. */
  text: string;
}

/**
 * Replace how a link renders. Return your own node (e.g. a task/member chip) to
 * substitute the link, or `defaultNode` for the standard `<a>`.
 */
export type RenderLink = (link: RichTextLink, defaultNode: ReactNode) => ReactNode;
```

- [ ] **Step 2: Add failing tests to `renderDoc.test.tsx`**

```tsx
import { renderDoc } from './renderDoc';
import { createBlock } from './model';
// (render with @testing-library/react; the file already imports render)

it('renderLink substitutes a link node in the viewer', () => {
  const doc = {
    blocks: [createBlock('paragraph', 'x', { marks: [{ type: 'link', href: 'https://a.com' }] })],
  };
  const { container } = render(
    <div>{renderDoc(doc, { renderLink: ({ href }) => <span data-chip>{href}</span> })}</div>,
  );
  expect(container.querySelector('[data-chip]')).not.toBeNull();
  expect(container.querySelector('a')).toBeNull();
});

it('editable mode wraps a custom link return in an atomic widget; a fallback return is not wrapped', () => {
  const doc = {
    blocks: [createBlock('paragraph', 'abc', { marks: [{ type: 'link', href: 'https://a.com' }] })],
  };
  const custom = render(
    <div>
      {renderDoc(doc, { editable: true, renderLink: ({ href }) => <span data-chip>{href}</span> })}
    </div>,
  );
  const w = custom.container.querySelector('[data-rich-link]');
  expect(w).not.toBeNull();
  expect(w!.getAttribute('data-len')).toBe('3'); // model run text length
  expect(w!.getAttribute('contenteditable')).toBe('false');

  const fb = render(
    <div>{renderDoc(doc, { editable: true, renderLink: (_l, fallback) => fallback })}</div>,
  );
  expect(fb.container.querySelector('[data-rich-link]')).toBeNull(); // plain link stays editable
  expect(fb.container.querySelector('a')).not.toBeNull();
});
```

(Note: `createBlock('paragraph', 'x', { marks })` applies `marks` to the run — verify the `CreateBlockAttrs` shape supports per-run marks; if not, build the block inline with `inlines: [{ text, marks }]`.)

- [ ] **Step 3: Thread `renderLink` through `renderDoc.tsx`**

Add to `RenderDocOptions`: `renderLink?: RenderLink;`. Thread `options` down through `renderBlock`/`blockContent`/`renderInlines`/`renderRun` to `wrapMark` (pass the run's plain text + the options). Replace the `case 'link'` in `wrapMark` with:

```tsx
case 'link': {
  const href = mark.type === 'link' ? safeHref(mark.href) : undefined;
  const fallback = (
    <a href={href} rel="noopener noreferrer">
      {child}
    </a>
  );
  if (!opts.renderLink || !href) return fallback;
  const custom = opts.renderLink({ href, text: runText }, fallback);
  if (custom === fallback) return fallback; // consumer declined → plain editable link
  if (!opts.editable) return custom;
  return (
    <span data-rich-link data-len={runText.length} contentEditable={false}>
      {custom}
    </span>
  );
}
```

`runText` is the plain text of the run being wrapped (pass it from `renderRun` — it's `run.text`). `opts` carries `{ editable, renderLink }`. Keep the existing signatures otherwise; thread `opts`/`runText` as params (do NOT use module state). The default `renderDoc(value)` (no options) behaves exactly as today.

- [ ] **Step 4: Run renderDoc + autolink tests → PASS** (`npx vitest run src/components/RichText/engine/`), `npx tsc --noEmit`.

- [ ] **Step 5: Commit** — `git commit -m "feat(RichText): renderLink option + atomic link widget in renderDoc"`.

---

## Task 3: widget-aware `selection.ts` (TDD — the risk area)

**Files:** Modify `RichTextEditor/selection.ts`; extend `selection.test.ts`.

Goal: `pointFromDom`/`pointToDom` must treat a `[data-rich-link]` widget as one atomic unit of `data-len` model chars (its display text differs from the model URL).

- [ ] **Step 1: Add failing round-trip tests to `selection.test.ts`**

Build an editable block in jsdom containing: text `"hi "` + an atomic widget (`<span data-rich-link data-len="13" contenteditable="false">#1 Task</span>`) + text `" end"`, all inside a `<p data-block-id="b1">`. The widget's model length is 13 (e.g. `https://a/t/1`), display `#1 Task` (7 chars). Assert:

```ts
// caret just before the widget → model offset 3 ("hi ")
// caret just after the widget  → model offset 3 + 13 = 16
// caret at end (" end")        → model offset 16 + 4 = 20
```

Write these as `pointFromDom(root, node, offset)` cases (place the DOM caret before/after the widget and at the end) AND the reverse `pointToDom(root, { blockId:'b1', offset })` for 3 / 16 / 20 (offsets at widget boundaries map to a DOM point adjacent to the widget, never inside it).

- [ ] **Step 2: Run → FAIL** (current code counts the widget's display text, so offsets after it are wrong).

- [ ] **Step 3: Make `offsetWithinBlock` widget-aware**

Keep `range.toString().length` as `raw`, then correct for each `[data-rich-link]` widget that lies **fully before** the range end:

```ts
function offsetWithinBlock(blockEl: HTMLElement, node: Node, offset: number): number {
  const doc = blockEl.ownerDocument;
  const range = doc.createRange();
  range.setStart(blockEl, 0);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }
  let len = range.toString().length;
  for (const w of Array.from(blockEl.querySelectorAll<HTMLElement>('[data-rich-link]'))) {
    // Is the widget entirely within [blockStart, (node,offset)] ? Compare the
    // range end against a point just AFTER the widget.
    const afterW = doc.createRange();
    afterW.setStartAfter(w);
    afterW.collapse(true);
    // range end >= afterW  ⇒  widget fully counted in `raw`.
    if (range.compareBoundaryPoints(Range.END_TO_START, afterW) >= 0) {
      const declared = Number(w.dataset.len ?? '0');
      const shown = w.textContent?.length ?? 0;
      len += declared - shown;
    }
  }
  return len;
}
```

(`compareBoundaryPoints(Range.END_TO_START, afterW)` compares THIS range's end to afterW's start; `>= 0` means our end is at/after the point just past the widget. Verify the comparison direction against the test; flip to `START_TO_END` / sign as needed until the round-trip tests pass — the TESTS are the spec.)

- [ ] **Step 4: Make `pointToDom` widget-aware**

Replace the text-only TreeWalker with a walk over text nodes AND `[data-rich-link]` widgets, accumulating model length (text → `textContent.length`; widget → `data-len`, do not descend). When `remaining` falls:

- inside a text node → `{ node: textNode, offset: remaining }`;
- at a widget boundary (`remaining === 0` at the widget, or after consuming it) → a DOM point in the widget's parent at the widget's child index (before) or +1 (after), so the caret sits adjacent, never inside.

```ts
export function pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null {
  const blockEl = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(point.blockId)}"]`);
  if (!blockEl) return null;
  let remaining = point.offset;
  const walker = blockEl.ownerDocument.createTreeWalker(
    blockEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(n) {
        if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        if (n instanceof HTMLElement && n.hasAttribute('data-rich-link'))
          return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP; // descend into non-widget elements
      },
    },
  );
  let last: Text | null = null;
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      const len = t.textContent?.length ?? 0;
      if (remaining <= len) return { node: t, offset: remaining };
      remaining -= len;
      last = t;
    } else {
      const w = n as HTMLElement;
      const declared = Number(w.dataset.len ?? '0');
      if (remaining <= 0) {
        const parent = w.parentNode!;
        return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, w) };
      }
      if (remaining <= declared) {
        const parent = w.parentNode!;
        return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, w) + 1 };
      }
      remaining -= declared;
      last = null;
    }
    n = walker.nextNode();
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: blockEl, offset: 0 };
}
```

- [ ] **Step 5: Run the selection tests → PASS** + the full editor suite (`npx vitest run src/components/RichTextEditor/selection.test.ts && npx vitest run src/components/RichTextEditor/`). The EXISTING selection tests (no widgets) must stay green — the corrections are no-ops when no `[data-rich-link]` is present.

- [ ] **Step 6: Commit** — `git commit -m "feat(RichTextEditor): widget-aware DOM<->model selection mapping for atomic link chips"`.

---

## Task 4: editor autolink (type + paste) + atomic delete

**Files:** Create `RichTextEditor/autolinkInput.ts` + test; modify `RichTextEditor.tsx`.

- [ ] **Step 1: `autolinkInput.ts` (pure) + test**

```ts
// autolinkInput.ts — pure helpers the editor's beforeinput handler uses for
// autolink-on-type and atomic deletion of a resolved-link run.
import type { RichDoc, Range, Point } from '../RichText/engine/model';
import { findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';
import { linkAt, setLink } from './links';
import { findUrl } from '../RichText/engine/autolink';

/** When typing `boundary` (e.g. ' ') at a collapsed caret, link the URL that ends
 *  at the caret. Returns the linked { doc, selection } with the caret AFTER the
 *  inserted boundary char, or null if there's no URL to link. */
export function applyTypeAutolink(
  doc: RichDoc,
  caret: Point,
  boundary: string,
): { doc: RichDoc; selection: Range } | null {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  const text = runsText(doc.blocks[idx].inlines).slice(0, caret.offset);
  const found = findUrl(text);
  if (!found) return null;
  // Already linked? (caret inside/after an existing link) → skip.
  if (linkAt(doc, caret)) return null;
  const range: Range = {
    anchor: { blockId: caret.blockId, offset: found.start },
    focus: { blockId: caret.blockId, offset: found.end },
  };
  const linked = setLink(doc, range, found.href);
  // Caret returns to the original position; the boundary char is inserted by the
  // caller's normal insertText path AFTER this (the editor sequences them).
  return { doc: linked.doc, selection: { anchor: caret, focus: caret } };
}

/** If the collapsed caret sits immediately AFTER (backward) or BEFORE (forward) a
 *  link run that `isResolved(href)` accepts, return the whole-run range to delete
 *  atomically, else null. */
export function atomicLinkDeleteRange(
  doc: RichDoc,
  caret: Point,
  dir: 'backward' | 'forward',
  isResolved: (href: string) => boolean,
): Range | null {
  const probe: Point =
    dir === 'backward' ? caret : { blockId: caret.blockId, offset: caret.offset + 1 };
  const at = linkAt(doc, probe);
  if (!at || !isResolved(at.href)) return null;
  // Only when the caret is exactly at the run's edge (after it for backward,
  // before it for forward).
  if (dir === 'backward' && caret.offset !== at.range.focus.offset) return null;
  if (dir === 'forward' && caret.offset !== at.range.anchor.offset) return null;
  return at.range;
}
```

Test `applyTypeAutolink` (URL before caret → links it; no URL → null; already-linked → null) and `atomicLinkDeleteRange` (caret after a resolved link → returns run range; unresolved → null; mid-run → null). Use small hand-built docs.

- [ ] **Step 2: Run → FAIL → implement → PASS.**

- [ ] **Step 3: Wire into `RichTextEditor.tsx` `onBeforeInput`**

In the `onBeforeInput` handler (after the block-rule branch ~line 433, before the generic `applyInput` at ~454):

(a) **Autolink on type:** when `latest.current.autolink !== false`, `e.inputType === 'insertText'`, `isCollapsed(range)`, and `e.data` is a boundary char (`' '` — Enter is handled via insertParagraph, optionally also link before splitting): call `applyTypeAutolink(doc, range.anchor, e.data)`. If it returns a result, first apply the link, then insert the boundary char (`insertText`) on the linked doc, `commit` the combined result, `e.preventDefault()`, return. (Sequence: link the URL, then insert the space after it.)

(b) **Atomic delete:** for `deleteContentBackward`/`deleteContentForward` with collapsed caret, when `latest.current.renderLink` is set, compute `isResolved = (href) => latest.current.renderLink!({ href, text: href }, FALLBACK_SENTINEL) !== FALLBACK_SENTINEL` and call `atomicLinkDeleteRange(doc, range.anchor, dir, isResolved)`. If it returns a range, `commit(deleteRange(doc, range))`, `preventDefault()`, return. (Use a stable sentinel node for the fallback so "consumer returned a custom node" is detectable.)

- [ ] **Step 4: Extend `onPaste` for plain-text URLs**

In the existing `onPaste` (after the HTML branch): if there's NO usable HTML but there IS `text/plain` that contains a URL and `autolink !== false`:

- selection non-empty + the plain text is a single bare URL → `commit(setLink(value, range, url))`, `preventDefault()`.
- otherwise → build a fragment from `linkifyRuns(plain)` (one paragraph block whose inlines are the linkified runs) and `commit(insertFragment(value, range, fragment))`, `preventDefault()`.

- [ ] **Step 5: Run the editor suite + typecheck.** Commit — `git commit -m "feat(RichTextEditor): autolink on type + paste; atomic delete of resolved-link chips"`.

---

## Task 5: `renderLink` / `autolink` props on the components

**Files:** Modify `RichText/RichText.tsx`, `RichTextEditor/RichTextEditor.tsx`; extend both component tests.

- [ ] **Step 1: `RichText.tsx`** — add `renderLink?: RenderLink` to `RichTextProps` (import the type from `./engine/renderLink`); pass it: `renderDoc(value, { renderLink })`. Add JSDoc. Test: a `renderLink` returning a chip renders the chip (`getByText`/querySelector), absent → default `<a>`.

- [ ] **Step 2: `RichTextEditor.tsx`** — add `renderLink?: RenderLink` and `autolink?: boolean` (default true) to `RichTextEditorProps` + the `latest` ref mirror (so the native listeners read them). Pass `renderDoc(value, { editable: true, renderLink })` at the existing call (~line 726). Add JSDoc (`@remarks`: don't do heavy sync work in `renderLink`; it's render-time, serialization stays a link; an editor chip is atomic, not editable text). Test: `renderLink` renders a chip wrapped in `[data-rich-link]`; `autolink={false}` disables the type rule.

- [ ] **Step 3: Run both component suites + typecheck.** Commit — `git commit -m "feat(RichText,RichTextEditor): renderLink + autolink props"`.

---

## Task 6: Exports + demos + AGENTS

**Files:** Modify `src/index.ts`, playground demos, `AGENTS.md`.

- [ ] **Step 1: `src/index.ts`** — export the types near the existing RichText exports:

```ts
export type { RichTextLink, RenderLink } from './components/RichText/engine/renderLink';
```

(Verify the existing RichText/RichTextEditor barrel exports; add `RichTextLink`/`RenderLink` alongside. No new component, no manifest change.)

- [ ] **Step 2: Demos** — in `RichTextEditorDemo.tsx` and `RichTextDemo.tsx`, add a `renderLink` example. A tiny in-file resolver:

```tsx
const TASK_RE = /^https?:\/\/app\.eocrm\/task\/(\d+)/i;
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = TASK_RE.exec(href);
  return m ? <Badge tone="accent">#{m[1]} · Ship the gallery</Badge> : fallback;
};
```

Show: a doc containing `https://app.eocrm/task/123` (renders the Badge chip) + a plain external link (renders `<a>`); and (editor) a note to type/paste a URL to autolink. Build the playground (`make build`).

- [ ] **Step 3: AGENTS.md** — extend the RichText/RichTextEditor entries: autolink (type+paste, `autolink` default true) + `renderLink` (viewer + editor; consumer owns in-space check + lookup; returns a chip or the fallback; editor chip is atomic).

- [ ] **Step 4: Format + commit** — `npx prettier --write` the changed files; `git commit -m "feat(RichText): export renderLink types; demos + AGENTS"`.

---

## Task 7: Full gates + browser verification

- [ ] **Step 1: Gates** — `make test && make build-lib && make lint && npm run format:check`; tarball gate `0`.

- [ ] **Step 2: Browser (Playwright) on `/components/rich-text-editor`:**
  - Type `see https://app.eocrm/task/123 ` → the URL becomes a link, then (with the demo `renderLink`) renders as the `#123` chip. Place the caret after the chip and press Backspace → the whole chip is removed in one step (atomic delete).
  - Arrow-left/right across the chip → the caret steps over it (never inside).
  - Paste a URL over selected text → the selection becomes linked.
  - On `/components/rich-text` (viewer): a doc with a task URL renders the chip; an external URL renders a plain link.
  - No console errors.

---

## Self-review notes

- **Spec coverage:** autolink type rule (T4) + paste (T4) via `autolink.ts` (T1) · `renderLink` types (T2) threaded through `renderDoc` viewer + editor atomic widget (T2) · widget-aware `selection.ts` (T3) · atomic delete (T4) · props on both components (T5) · exports + demos + AGENTS (T6) · no model/serialization change · no i18n. All spec sections map to a task.
- **Type consistency:** `RichTextLink { href, text }` + `RenderLink` defined in `renderLink.ts` (T2), consumed by `renderDoc` (T2), `RichText`/`RichTextEditor` (T5), re-exported from `src/index.ts` (T6). `[data-rich-link][data-len]` produced in T2 is consumed by the T3 selection mapping and T4 atomic delete.
- **Risk:** T3 (selection mapping) is the crux — the `compareBoundaryPoints` direction and the `pointToDom` widget walk must be validated against the T3 round-trip tests (the tests are the spec; adjust the comparison sign until green) and the browser pass (T7). The corrections are no-ops without `[data-rich-link]`, so existing selection behavior is preserved.
- **Backward-compat:** `renderDoc(value)` with no options is unchanged; `renderLink`/`autolink` are additive optional props; the model + `toHtml`/`toMarkdown` are untouched.
