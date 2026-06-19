# RichTextEditor — Serialization / Import slice (Slice 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `fromHtml` / `fromMarkdown` import functions to the RichText engine and wire rich-HTML paste into `<RichTextEditor>`.

**Architecture:** HTML parsing uses the browser's built-in `DOMParser` with an allowlist DOM walk (the walk _is_ the sanitizer). Markdown routes through HTML (`fromMarkdown = fromHtml(mdToHtml(md))`) so there's one tag→model mapping. Paste inserts a parsed fragment via a new pure `insertFragment` transform. No new dependency.

**Tech Stack:** TypeScript, React 19, Vitest + RTL (jsdom — `globals: true`, so do NOT import `describe`/`it`/`expect`/`vi`), the in-house RichText engine.

**Spec:** `docs/superpowers/specs/2026-06-19-richtext-serialization-import-design.md`

---

## Context the engineer needs

- **The model** (`src/components/RichText/engine/model.ts`): `RichDoc = { blocks: Block[] }`. `Block = { id; type: BlockType; level?: 1|2|3; depth?: number; inlines: Inline[] }`. `BlockType = 'paragraph'|'heading'|'bullet_item'|'ordered_item'|'blockquote'|'code_block'`. `Inline = { text: string; marks: Mark[] }`. `Mark` is `{type:'bold'|'italic'|'underline'|'strike'|'code'} | {type:'link'; href:string}`. Constructors: `createBlock`, `nextId()` (session-unique id), `emptyDoc()` (one empty paragraph).
- **Inline helpers** (`engine/inlines.ts`): `normalizeInlines(inlines)` (merge adjacent equal-mark runs, drop empties, ≥1 run), `sliceInlines(inlines, start, end)`, `runsLength(inlines)`, `runsText(inlines)`.
- **Position helpers** (`engine/position.ts`): `blockLength(block)`, `findBlockIndex(doc, id)`, `isCollapsed(range)`, `orderedRange(doc, range)`.
- **Transforms** (`engine/transforms.ts`): `deleteRange(doc, range): {doc, selection}`. Module-private helpers already in the file: `collapsed(point): Range`, `replaceBlock(doc, index, block)`.
- **`safeHref`** is currently a **private** function inside `engine/renderDoc.tsx` (lines ~13–24). Task 1 extracts it.
- **Editor** (`RichTextEditor.tsx`): a `latest` ref holds `{ value, onChange, readOnly }` (`latest.current.*`); `commit({doc, selection})` fires `onChange` and stashes the selection (no-ops on reference-equal doc); `readSelection(root)` from `./selection`; `isEmptyDoc(doc)` helper exists; native `beforeinput` listener is set up in a `useEffect`.
- **Exports:** engine functions are re-exported from `src/components/RichText/index.ts`, which `src/index.ts` re-exports. Add new functions in BOTH.
- **Vitest globals:** tests do NOT import `describe`/`it`/`expect`/`vi`. They import `render`/`screen` from `@testing-library/react`, `userEvent`, and the unit under test. jsdom provides `DOMParser`.
- **Run one test file:** `cd packages/design-system && npm test -- src/components/RichText/engine/<file>`. Full gate (repo root): `make test && make build-lib && make lint && npm run format:check`.
- **`structure.test.ts`** only enforces the four-file rule on top-level `components/<Name>/` dirs — these modules live in `engine/`, so no four-file obligation.

## File structure

- **Create** `engine/safeHref.ts` (+ `safeHref.test.ts`) — extracted sanitizer.
- **Create** `engine/fromHtml.ts` (+ `fromHtml.test.ts`) — DOMParser allowlist walk.
- **Create** `engine/mdToHtml.ts` (+ `mdToHtml.test.ts`) — Markdown → HTML subset (internal).
- **Create** `engine/fromMarkdown.ts` (+ `fromMarkdown.test.ts`) — `fromHtml(mdToHtml(md))`.
- **Modify** `engine/renderDoc.tsx` — import `safeHref` from `./safeHref`.
- **Modify** `engine/transforms.ts` (+ `transforms.test.ts`) — add `insertFragment`.
- **Modify** `components/RichText/index.ts` + `src/index.ts` — export `fromHtml`, `fromMarkdown`.
- **Modify** `RichTextEditor.tsx` (+ `RichTextEditor.test.tsx`) — paste wiring.
- **Modify** `RichTextEditorDemo.tsx`, `RichTextEditor.tsx` JSDoc, `AGENTS.md` — docs/demo.

---

## Task 1: Extract `safeHref` to a shared module

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/safeHref.ts`
- Create: `packages/design-system/src/components/RichText/engine/safeHref.test.ts`
- Modify: `packages/design-system/src/components/RichText/engine/renderDoc.tsx`

- [ ] **Step 1: Write the failing test**

Create `safeHref.test.ts`:

```ts
import { safeHref } from './safeHref';

describe('safeHref', () => {
  it('keeps relative paths and the http(s)/mailto/tel schemes', () => {
    expect(safeHref('/path')).toBe('/path');
    expect(safeHref('./x')).toBe('./x');
    expect(safeHref('#frag')).toBe('#frag');
    expect(safeHref('https://x.test')).toBe('https://x.test');
    expect(safeHref('http://x.test')).toBe('http://x.test');
    expect(safeHref('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(safeHref('tel:+123')).toBe('tel:+123');
  });

  it('drops dangerous and protocol-relative URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html;base64,xx')).toBeUndefined();
    expect(safeHref('//evil.test')).toBeUndefined();
    expect(safeHref('   ')).toBeUndefined();
    expect(safeHref('')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/safeHref.test.ts`
Expected: FAIL — `./safeHref` not found.

- [ ] **Step 3: Create `safeHref.ts` (verbatim from renderDoc)**

```ts
// safeHref.ts — URL allowlist shared by the renderer (renderDoc) and the HTML
// importer (fromHtml). Allows relative URLs + a small scheme allowlist; blocks
// javascript:/data:/protocol-relative so a hostile href never reaches output.
export function safeHref(href: string): string | undefined {
  const trimmed = href.trim();
  if (trimmed === '') return undefined;
  // Block protocol-relative URLs (`//host`) — they navigate cross-origin and
  // would otherwise slip through the "relative" branch below.
  if (trimmed.startsWith('//')) return undefined;
  // Has an explicit scheme? Only http(s)/mailto/tel are allowed.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : undefined;
  }
  return trimmed; // relative (/, ./, #, ?, plain path) — safe
}
```

- [ ] **Step 4: Update `renderDoc.tsx` to import it**

In `renderDoc.tsx`, DELETE the local `function safeHref(...) {...}` (the block at ~lines 12–24, including its `// Allow relative URLs…` comment) and add an import near the top (after the existing `import { runsText, runsLength } from './inlines';`):

```tsx
import { safeHref } from './safeHref';
```

- [ ] **Step 5: Verify tests + the renderDoc suite pass**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/safeHref.test.ts src/components/RichText/engine/renderDoc.test.tsx && npm run typecheck`
Expected: PASS (safeHref tests + the existing renderDoc tests, which exercise link rendering through the now-imported `safeHref`).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/safeHref.ts packages/design-system/src/components/RichText/engine/safeHref.test.ts packages/design-system/src/components/RichText/engine/renderDoc.tsx
git commit -m "refactor(RichText): extract safeHref to a shared engine module"
```

---

## Task 2: `fromHtml`

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/fromHtml.ts`
- Create: `packages/design-system/src/components/RichText/engine/fromHtml.test.ts`

- [ ] **Step 1: Write the failing test**

Create `fromHtml.test.ts`:

```ts
import { fromHtml } from './fromHtml';
import { runsText } from './inlines';
import type { Block } from './model';

// Strip ids for stable structural assertions.
const shape = (b: Block) => ({
  type: b.type,
  ...(b.level !== undefined ? { level: b.level } : {}),
  ...(b.depth !== undefined ? { depth: b.depth } : {}),
  inlines: b.inlines.map((r) => ({ text: r.text, marks: r.marks })),
});
const text = (b: Block) => runsText(b.inlines);

describe('fromHtml — blocks', () => {
  it('maps headings (h4–h6 clamp to level 3) and paragraphs', () => {
    const d = fromHtml('<h1>A</h1><h2>B</h2><h5>C</h5><p>D</p>');
    expect(d.blocks.map((b) => [b.type, b.level, text(b)])).toEqual([
      ['heading', 1, 'A'],
      ['heading', 2, 'B'],
      ['heading', 3, 'C'],
      ['paragraph', undefined, 'D'],
    ]);
  });

  it('maps a blockquote (inner paragraphs → blockquote blocks)', () => {
    const d = fromHtml('<blockquote><p>one</p><p>two</p></blockquote>');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['blockquote', 'one'],
      ['blockquote', 'two'],
    ]);
  });

  it('maps pre/code to a code_block preserving whitespace', () => {
    const d = fromHtml('<pre><code>a\n  b</code></pre>');
    expect(d.blocks[0].type).toBe('code_block');
    expect(text(d.blocks[0])).toBe('a\n  b');
  });

  it('maps nested lists to flat items with depth', () => {
    const d = fromHtml('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
    expect(d.blocks.map((b) => [b.type, b.depth, text(b)])).toEqual([
      ['bullet_item', 0, 'a'],
      ['bullet_item', 1, 'b'],
      ['bullet_item', 0, 'c'],
    ]);
  });

  it('uses ordered_item for <ol>', () => {
    const d = fromHtml('<ol><li>a</li></ol>');
    expect(d.blocks[0].type).toBe('ordered_item');
  });

  it('unwraps unknown containers and wraps loose text in a paragraph', () => {
    const d = fromHtml('<div><p>x</p></div>loose');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['paragraph', 'x'],
      ['paragraph', 'loose'],
    ]);
  });

  it('drops script/style/table/img/hr', () => {
    const d = fromHtml(
      '<p>a</p><script>bad()</script><style>x{}</style><table><tr><td>t</td></tr></table><img src="x"><hr><p>b</p>',
    );
    expect(d.blocks.map(text)).toEqual(['a', 'b']);
  });

  it('splits a <br> into separate blocks', () => {
    const d = fromHtml('<p>a<br>b</p>');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['paragraph', 'a'],
      ['paragraph', 'b'],
    ]);
  });

  it('returns emptyDoc for empty/whitespace input', () => {
    expect(fromHtml('').blocks).toEqual([
      { id: expect.any(String), type: 'paragraph', inlines: [{ text: '', marks: [] }] },
    ]);
    expect(fromHtml('   \n  ').blocks.length).toBe(1);
    expect(runsText(fromHtml('   ').blocks[0].inlines)).toBe('');
  });
});

describe('fromHtml — inline marks', () => {
  it('maps semantic inline tags to marks', () => {
    const d = fromHtml('<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code></p>');
    expect(d.blocks[0].inlines).toEqual([
      { text: 'b', marks: [{ type: 'bold' }] },
      { text: 'i', marks: [{ type: 'italic' }] },
      { text: 'u', marks: [{ type: 'underline' }] },
      { text: 's', marks: [{ type: 'strike' }] },
      { text: 'c', marks: [{ type: 'code' }] },
    ]);
  });

  it('combines nested marks', () => {
    const d = fromHtml('<p><strong><em>x</em></strong></p>');
    expect(d.blocks[0].inlines).toEqual([
      { text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('maps a[href] to a link via safeHref, dropping unsafe hrefs but keeping text', () => {
    const ok = fromHtml('<p><a href="/x">t</a></p>');
    expect(ok.blocks[0].inlines).toEqual([{ text: 't', marks: [{ type: 'link', href: '/x' }] }]);
    const bad = fromHtml('<p><a href="javascript:alert(1)">t</a></p>');
    expect(bad.blocks[0].inlines).toEqual([{ text: 't', marks: [] }]);
  });

  it('recovers bold/italic/underline/strike from inline CSS (Word/Docs)', () => {
    const d = fromHtml(
      '<p><span style="font-weight:700">b</span><span style="font-style:italic">i</span><span style="text-decoration:underline">u</span><span style="text-decoration:line-through">s</span></p>',
    );
    expect(d.blocks[0].inlines).toEqual([
      { text: 'b', marks: [{ type: 'bold' }] },
      { text: 'i', marks: [{ type: 'italic' }] },
      { text: 'u', marks: [{ type: 'underline' }] },
      { text: 's', marks: [{ type: 'strike' }] },
    ]);
  });

  it('collapses whitespace and trims block edges', () => {
    const d = fromHtml('<p>  a   b  </p>');
    expect(text(d.blocks[0])).toBe('a b');
  });
});
```

NOTE: `expect.any(String)` and `expect(...).toEqual` with nested objects work under Vitest globals; no import needed.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/fromHtml.test.ts`
Expected: FAIL — `./fromHtml` not found.

- [ ] **Step 3: Implement `fromHtml.ts`**

```ts
// fromHtml.ts — parse an HTML string into the RichText model. Uses the browser's
// built-in DOMParser (inert: scripts never run) and walks the DOM with a strict
// allowlist — the walk IS the sanitizer, since it only extracts text + known
// marks + safeHref-checked links and emits a plain model. Requires a DOM
// environment (browser; jsdom in tests).
import type { RichDoc, Block, Inline, Mark, BlockType } from './model';
import { nextId, emptyDoc } from './model';
import { normalizeInlines } from './inlines';
import { safeHref } from './safeHref';

const HEADING_LEVEL: Record<string, 1 | 2 | 3> = { H1: 1, H2: 2, H3: 3, H4: 3, H5: 3, H6: 3 };

// Block-level tags that flush the loose-inline buffer and emit their own block(s).
const BLOCK_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'PRE',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'DIV',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'HEADER',
  'FOOTER',
  'ASIDE',
  'NAV',
  'ADDRESS',
  'DL',
  'DT',
  'DD',
  'FIGCAPTION',
]);

// Tags whose entire subtree is dropped (no text extracted).
const DROP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'HEAD',
  'TITLE',
  'NOSCRIPT',
  'TEMPLATE',
  'IMG',
  'PICTURE',
  'SVG',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'CANVAS',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TD',
  'TH',
  'COLGROUP',
  'COL',
  'HR',
  'FORM',
  'INPUT',
  'SELECT',
  'TEXTAREA',
  'BUTTON',
  'LABEL',
  'FIGURE',
]);

const isElement = (n: Node): n is HTMLElement => n.nodeType === 1;
const isText = (n: Node): n is Text => n.nodeType === 3;

const collapseWs = (s: string): string => s.replace(/\s+/g, ' ');

/** Replace a same-type mark (e.g. nested links), else append. */
function addMark(marks: Mark[], mark: Mark): Mark[] {
  return [...marks.filter((m) => m.type !== mark.type), mark];
}

/** Marks active for the descendants of `el`: parent ∪ tag mark ∪ link ∪ inline CSS. */
function marksFor(el: HTMLElement, parent: Mark[]): Mark[] {
  let marks = parent;
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      marks = addMark(marks, { type: 'bold' });
      break;
    case 'EM':
    case 'I':
      marks = addMark(marks, { type: 'italic' });
      break;
    case 'U':
      marks = addMark(marks, { type: 'underline' });
      break;
    case 'S':
    case 'DEL':
    case 'STRIKE':
      marks = addMark(marks, { type: 'strike' });
      break;
    case 'CODE':
      marks = addMark(marks, { type: 'code' });
      break;
    case 'A': {
      const href = safeHref(el.getAttribute('href') ?? '');
      if (href !== undefined) marks = addMark(marks, { type: 'link', href });
      break;
    }
  }
  return applyCssMarks(el, marks);
}

/** Recover bold/italic/underline/strike from a small set of inline CSS props. */
function applyCssMarks(el: HTMLElement, marks: Mark[]): Mark[] {
  const style = el.getAttribute('style');
  if (!style) return marks;
  const s = style.toLowerCase();
  const weight = /font-weight\s*:\s*(\d+|bold|bolder)/.exec(s);
  if (weight && (weight[1] === 'bold' || weight[1] === 'bolder' || Number(weight[1]) >= 600)) {
    marks = addMark(marks, { type: 'bold' });
  }
  if (/font-style\s*:\s*(italic|oblique)/.test(s)) marks = addMark(marks, { type: 'italic' });
  const deco = /text-decoration(?:-line)?\s*:\s*([^;]+)/.exec(s);
  if (deco) {
    if (deco[1].includes('underline')) marks = addMark(marks, { type: 'underline' });
    if (deco[1].includes('line-through')) marks = addMark(marks, { type: 'strike' });
  }
  return marks;
}

/** Walk inline content, appending runs to `segments` (last entry = current soft-line). */
function walkInline(node: Node, marks: Mark[], segments: Inline[][]): void {
  if (isText(node)) {
    const t = collapseWs(node.nodeValue ?? '');
    if (t) segments[segments.length - 1].push({ text: t, marks });
    return;
  }
  if (!isElement(node)) return;
  if (DROP_TAGS.has(node.tagName)) return;
  if (node.tagName === 'BR') {
    segments.push([]);
    return;
  }
  const next = marksFor(node, marks);
  for (const child of Array.from(node.childNodes)) walkInline(child, next, segments);
}

/** Trim leading whitespace of the first run and trailing whitespace of the last. */
function trimSegment(seg: Inline[]): Inline[] {
  if (seg.length === 0) return seg;
  const out = seg.map((r) => ({ ...r }));
  out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, '') };
  const last = out.length - 1;
  out[last] = { ...out[last], text: out[last].text.replace(/\s+$/, '') };
  return out;
}

function blockFrom(
  type: BlockType,
  inlines: Inline[],
  attrs: { level?: 1 | 2 | 3; depth?: number } = {},
): Block {
  const norm = normalizeInlines(inlines);
  const block: Block = { id: nextId(), type, inlines: norm };
  if (attrs.level !== undefined) block.level = attrs.level;
  if (attrs.depth !== undefined) block.depth = attrs.depth;
  return block;
}

const isEmptySeg = (inlines: Inline[]): boolean => inlines.length === 1 && inlines[0].text === '';

/** Emit an inline-only block (paragraph/heading), splitting at <br> into siblings. */
function pushInlineBlocks(
  el: HTMLElement,
  type: BlockType,
  out: Block[],
  attrs: { level?: 1 | 2 | 3 },
): void {
  const segments: Inline[][] = [[]];
  for (const child of Array.from(el.childNodes)) walkInline(child, [], segments);
  let pushed = false;
  for (const seg of segments) {
    const inlines = normalizeInlines(trimSegment(seg));
    if (segments.length > 1 && isEmptySeg(inlines)) continue;
    out.push(blockFrom(type, inlines, attrs));
    pushed = true;
  }
  if (!pushed) out.push(blockFrom(type, [{ text: '', marks: [] }], attrs));
}

function emitListItem(li: HTMLElement, itemType: BlockType, out: Block[], depth: number): void {
  const segments: Inline[][] = [[]];
  const nested: HTMLElement[] = [];
  for (const child of Array.from(li.childNodes)) {
    if (isElement(child) && (child.tagName === 'UL' || child.tagName === 'OL')) nested.push(child);
    else walkInline(child, [], segments);
  }
  for (const seg of segments) {
    const inlines = normalizeInlines(trimSegment(seg));
    if (segments.length > 1 && isEmptySeg(inlines)) continue;
    out.push({ id: nextId(), type: itemType, depth, inlines });
  }
  for (const sub of nested) emitBlock(sub, out, depth + 1);
}

function emitBlock(el: HTMLElement, out: Block[], listDepth: number): void {
  const tag = el.tagName;
  if (tag in HEADING_LEVEL) {
    pushInlineBlocks(el, 'heading', out, { level: HEADING_LEVEL[tag] });
    return;
  }
  if (tag === 'P') {
    pushInlineBlocks(el, 'paragraph', out, {});
    return;
  }
  if (tag === 'PRE') {
    out.push(blockFrom('code_block', [{ text: el.textContent ?? '', marks: [] }]));
    return;
  }
  if (tag === 'BLOCKQUOTE') {
    const inner: Block[] = [];
    collectBlocks(el, inner, listDepth);
    for (const b of inner) {
      const q: Block = { id: nextId(), type: 'blockquote', inlines: b.inlines };
      out.push(q);
    }
    return;
  }
  if (tag === 'UL' || tag === 'OL') {
    const itemType: BlockType = tag === 'OL' ? 'ordered_item' : 'bullet_item';
    for (const child of Array.from(el.children)) {
      if (child.tagName === 'LI') emitListItem(child as HTMLElement, itemType, out, listDepth);
    }
    return;
  }
  if (tag === 'LI') {
    emitListItem(el, 'bullet_item', out, listDepth);
    return;
  }
  // Unknown block container → unwrap.
  collectBlocks(el, out, listDepth);
}

function collectBlocks(parent: Node, out: Block[], listDepth: number): void {
  let buffer: Inline[][] = [[]];
  const flush = () => {
    for (const seg of buffer) {
      const inlines = normalizeInlines(trimSegment(seg));
      if (isEmptySeg(inlines)) continue;
      out.push(blockFrom('paragraph', inlines));
    }
    buffer = [[]];
  };
  for (const child of Array.from(parent.childNodes)) {
    if (isText(child)) {
      const t = collapseWs(child.nodeValue ?? '');
      if (t) buffer[buffer.length - 1].push({ text: t, marks: [] });
      continue;
    }
    if (!isElement(child)) continue;
    if (DROP_TAGS.has(child.tagName)) continue;
    if (BLOCK_TAGS.has(child.tagName)) {
      flush();
      emitBlock(child, out, listDepth);
    } else {
      walkInline(child, [], buffer); // unknown inline element → into the buffer
    }
  }
  flush();
}

/**
 * Parse an HTML string into a `RichDoc`. Recognized tags map to blocks/marks; an
 * inline-CSS subset (font-weight/style/text-decoration) recovers Word/Docs
 * formatting; unknown containers unwrap (text kept); script/style/table/img/etc.
 * are dropped. Hrefs are sanitized via `safeHref`. Requires a DOM environment.
 *
 * @example
 * const doc = fromHtml('<h1>Title</h1><p>Hello <strong>world</strong></p>');
 */
export function fromHtml(html: string): RichDoc {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const blocks: Block[] = [];
  collectBlocks(parsed.body, blocks, 0);
  return blocks.length ? { blocks } : emptyDoc();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/fromHtml.test.ts && npm run typecheck`
Expected: PASS (all `fromHtml` cases). If a whitespace case fails, recheck `trimSegment`/`collapseWs`; do not weaken tests.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/fromHtml.ts packages/design-system/src/components/RichText/engine/fromHtml.test.ts
git commit -m "feat(RichText): fromHtml — parse HTML into the model (DOMParser + allowlist)"
```

---

## Task 3: `mdToHtml`

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/mdToHtml.ts`
- Create: `packages/design-system/src/components/RichText/engine/mdToHtml.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mdToHtml.test.ts`:

````ts
import { mdToHtml } from './mdToHtml';

describe('mdToHtml — blocks', () => {
  it('converts ATX headings', () => {
    expect(mdToHtml('# A\n## B')).toBe('<h1>A</h1><h2>B</h2>');
  });
  it('converts paragraphs (wrapped lines joined)', () => {
    expect(mdToHtml('one\ntwo\n\nthree')).toBe('<p>one two</p><p>three</p>');
  });
  it('converts fenced code verbatim and escaped', () => {
    expect(mdToHtml('```\na <b>\n```')).toBe('<pre><code>a &lt;b&gt;</code></pre>');
  });
  it('converts blockquotes', () => {
    expect(mdToHtml('> quoted')).toBe('<blockquote><p>quoted</p></blockquote>');
  });
  it('converts unordered and ordered lists', () => {
    expect(mdToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(mdToHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>');
  });
  it('nests lists by indentation', () => {
    expect(mdToHtml('- a\n  - b')).toBe('<ul><li>a<ul><li>b</li></ul></li></ul>');
  });
});

describe('mdToHtml — inline', () => {
  it('converts bold/italic/strike/code', () => {
    expect(mdToHtml('**b** *i* ~~s~~ `c`')).toBe(
      '<p><strong>b</strong> <em>i</em> <del>s</del> <code>c</code></p>',
    );
  });
  it('converts links but not images', () => {
    expect(mdToHtml('[t](/u)')).toBe('<p><a href="/u">t</a></p>');
    expect(mdToHtml('![alt](/img.png)')).toBe('<p>alt</p>');
  });
  it('honors backslash escapes and escapes HTML in text', () => {
    expect(mdToHtml('a \\* b')).toBe('<p>a * b</p>');
    expect(mdToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
  });
});
````

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/mdToHtml.test.ts`
Expected: FAIL — `./mdToHtml` not found.

- [ ] **Step 3: Implement `mdToHtml.ts`**

````ts
// mdToHtml.ts — minimal Markdown → HTML-subset converter (INTERNAL). Emits only
// the tags fromHtml understands (h1-6, p, pre>code, blockquote, ul/ol/li, and
// inline strong/em/del/code/a), so fromMarkdown = fromHtml(mdToHtml(md)) reuses
// one mapping. CommonMark + GFM strikethrough subset. Never throws.

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ESC[c]);

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** Convert inline Markdown to HTML. Unbalanced markers degrade to literal text. */
function inline(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      out += escapeHtml(src[i + 1]);
      i += 2;
      continue;
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) {
        out += '<code>' + escapeHtml(src.slice(i + 1, end)) + '</code>';
        i = end + 1;
        continue;
      }
    }
    if (c === '!' && src[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(src.slice(i));
      if (m) {
        out += inline(m[1]); // image → its alt text (not a link, not an <img>)
        i += m[0].length;
        continue;
      }
    }
    if (c === '[') {
      const m = /^\[([^\]]*)\]\(([^)]*)\)/.exec(src.slice(i));
      if (m) {
        out += '<a href="' + escapeHtml(m[2].trim()) + '">' + inline(m[1]) + '</a>';
        i += m[0].length;
        continue;
      }
    }
    if ((c === '*' || c === '_') && src[i + 1] === c) {
      const marker = c + c;
      const end = src.indexOf(marker, i + 2);
      if (end !== -1) {
        out += '<strong>' + inline(src.slice(i + 2, end)) + '</strong>';
        i = end + 2;
        continue;
      }
    }
    if (c === '~' && src[i + 1] === '~') {
      const end = src.indexOf('~~', i + 2);
      if (end !== -1) {
        out += '<del>' + inline(src.slice(i + 2, end)) + '</del>';
        i = end + 2;
        continue;
      }
    }
    if (c === '*' || c === '_') {
      const end = src.indexOf(c, i + 1);
      if (end > i + 1) {
        out += '<em>' + inline(src.slice(i + 1, end)) + '</em>';
        i = end + 1;
        continue;
      }
    }
    out += escapeHtml(c);
    i += 1;
  }
  return out;
}

/** Parse one list starting at `lines[start]` whose marker indent is `indent`. */
function parseList(lines: string[], start: number, indent: number): [string, number] {
  const ordered = /\d/.test(LIST_RE.exec(lines[start])![2]);
  const tag = ordered ? 'ol' : 'ul';
  let i = start;
  let html = `<${tag}>`;
  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || m[1].length < indent) break;
    if (m[1].length > indent) break; // deeper line handled as nested below
    let item = '<li>' + inline(m[3].trim());
    i += 1;
    while (i < lines.length) {
      const deeper = LIST_RE.exec(lines[i]);
      if (deeper && deeper[1].length > indent) {
        const [nested, consumed] = parseList(lines, i, deeper[1].length);
        item += nested;
        i = consumed;
      } else break;
    }
    item += '</li>';
    html += item;
  }
  return [html + `</${tag}>`, i];
}

/** Convert a Markdown string to the HTML subset fromHtml understands. */
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const fence = /^(```|~~~)/.exec(line);
    if (fence) {
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith(fence[1])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing fence
      out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>` + inline(h[2].trim()) + `</h${level}>`);
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push('<blockquote>' + mdToHtml(quote.join('\n')) + '</blockquote>');
      continue;
    }
    if (LIST_RE.test(line)) {
      const [html, consumed] = parseList(lines, i, LIST_RE.exec(line)![1].length);
      out.push(html);
      i = consumed;
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(```|~~~)/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('');
}
````

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/mdToHtml.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/mdToHtml.ts packages/design-system/src/components/RichText/engine/mdToHtml.test.ts
git commit -m "feat(RichText): mdToHtml — Markdown to HTML-subset converter"
```

---

## Task 4: `fromMarkdown`

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/fromMarkdown.ts`
- Create: `packages/design-system/src/components/RichText/engine/fromMarkdown.test.ts`

- [ ] **Step 1: Write the failing test**

Create `fromMarkdown.test.ts`:

````ts
import { fromMarkdown } from './fromMarkdown';
import { runsText } from './inlines';

describe('fromMarkdown', () => {
  it('parses a representative document end-to-end', () => {
    const md =
      '# Title\n\nRead the [docs](/x) and **note** this.\n\n- a\n  - b\n\n> quote\n\n```\ncode\n```';
    const d = fromMarkdown(md);
    expect(d.blocks.map((b) => [b.type, b.depth, runsText(b.inlines)])).toEqual([
      ['heading', undefined, 'Title'],
      ['paragraph', undefined, 'Read the docs and note this.'],
      ['bullet_item', 0, 'a'],
      ['bullet_item', 1, 'b'],
      ['blockquote', undefined, 'quote'],
      ['code_block', undefined, 'code'],
    ]);
  });

  it('carries link + bold marks through the HTML hop', () => {
    const d = fromMarkdown('[t](/u) and **b**');
    expect(d.blocks[0].inlines).toEqual([
      { text: 't', marks: [{ type: 'link', href: '/u' }] },
      { text: ' and ', marks: [] },
      { text: 'b', marks: [{ type: 'bold' }] },
    ]);
  });

  it('never produces underline (no Markdown syntax for it)', () => {
    const d = fromMarkdown('**b** *i* ~~s~~');
    const marks = d.blocks[0].inlines.flatMap((r) => r.marks.map((m) => m.type));
    expect(marks).not.toContain('underline');
  });
});
````

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/fromMarkdown.test.ts`
Expected: FAIL — `./fromMarkdown` not found.

- [ ] **Step 3: Implement `fromMarkdown.ts`**

```ts
// fromMarkdown.ts — parse a Markdown string into the RichText model by routing
// through HTML (mdToHtml) so the tag→model mapping + sanitization live in one
// place (fromHtml). CommonMark + GFM strikethrough subset. Requires a DOM
// environment (DOMParser, via fromHtml).
import type { RichDoc } from './model';
import { fromHtml } from './fromHtml';
import { mdToHtml } from './mdToHtml';

/**
 * Parse a Markdown string into a `RichDoc`. Supports headings, bold/italic,
 * strikethrough (`~~`), inline code, links, blockquotes, ordered/unordered
 * (nested) lists, and fenced code blocks. Lossy by nature: Markdown has no
 * underline syntax (never produced) and images/tables are not modeled.
 *
 * @example
 * const doc = fromMarkdown('# Title\n\n- one\n- two');
 */
export function fromMarkdown(md: string): RichDoc {
  return fromHtml(mdToHtml(md));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/fromMarkdown.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/fromMarkdown.ts packages/design-system/src/components/RichText/engine/fromMarkdown.test.ts
git commit -m "feat(RichText): fromMarkdown = fromHtml(mdToHtml(...))"
```

---

## Task 5: `insertFragment` transform

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/transforms.ts`
- Test: `packages/design-system/src/components/RichText/engine/transforms.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `transforms.test.ts` (it already imports from `./transforms`, `./model`; match its existing helper style — check the top of the file for `createBlock`/range helpers and reuse them. The block below is self-contained):

```ts
import { insertFragment } from './transforms';
import { createBlock } from './model';
import type { RichDoc } from './model';

const para = (id: string, text: string): RichDoc['blocks'][number] =>
  createBlock('paragraph', text, { id });
const at = (blockId: string, offset: number) => ({ blockId, offset });
const collapsedR = (blockId: string, offset: number) => ({
  anchor: at(blockId, offset),
  focus: at(blockId, offset),
});

describe('insertFragment', () => {
  it('single-block fragment → inline splice with caret after it', () => {
    const doc: RichDoc = { blocks: [para('a', 'abcd')] };
    const frag: RichDoc = { blocks: [createBlock('paragraph', 'XY', { id: 'f' })] };
    const r = insertFragment(doc, collapsedR('a', 2), frag);
    expect(r.doc.blocks.length).toBe(1);
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'abXYcd', marks: [] }]);
    expect(r.selection).toEqual(collapsedR('a', 4));
  });

  it('multi-block fragment → split current block and merge ends', () => {
    const doc: RichDoc = { blocks: [para('a', 'abcd')] };
    const frag: RichDoc = {
      blocks: [
        createBlock('paragraph', 'X', { id: 'f0' }),
        createBlock('heading', 'Y', { id: 'f1', level: 2 }),
        createBlock('paragraph', 'Z', { id: 'f2' }),
      ],
    };
    const r = insertFragment(doc, collapsedR('a', 2), frag);
    expect(r.doc.blocks.map((b) => [b.type, b.inlines.map((i) => i.text).join('')])).toEqual([
      ['paragraph', 'abX'],
      ['heading', 'Y'],
      ['paragraph', 'Zcd'],
    ]);
    // caret at the join: start of the old right part inside the last (merged) block.
    expect(r.selection.anchor.offset).toBe(1);
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[2].id);
  });

  it('non-collapsed range is deleted first, then the fragment inserted', () => {
    const doc: RichDoc = { blocks: [para('a', 'abcd')] };
    const frag: RichDoc = { blocks: [createBlock('paragraph', 'X', { id: 'f' })] };
    const r = insertFragment(doc, { anchor: at('a', 1), focus: at('a', 3) }, frag);
    expect(r.doc.blocks[0].inlines).toEqual([{ text: 'aXd', marks: [] }]);
  });

  it('an empty fragment is a no-op (collapsed caret returned)', () => {
    const doc: RichDoc = { blocks: [para('a', 'abcd')] };
    const r = insertFragment(doc, collapsedR('a', 2), {
      blocks: [createBlock('paragraph', '', { id: 'e' })],
    });
    expect(r.doc).toBe(doc);
    expect(r.selection).toEqual(collapsedR('a', 2));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/transforms.test.ts -t insertFragment`
Expected: FAIL — `insertFragment` not exported.

- [ ] **Step 3: Implement `insertFragment`**

In `transforms.ts`, extend the imports:

- From `./inlines`: add `runsLength` → `import { normalizeInlines, sliceInlines, mapMarksOverRange, runsLength } from './inlines';`
- From `./position`: add `isCollapsed` → `import { blockLength, findBlockIndex, orderedRange, isCollapsed } from './position';`
- From `./model`: add `nextId` → `import { createBlock, nextId } from './model';`

Then add at the end of the file:

```ts
/**
 * Pure/immutable. Insert a multi-block `fragment` at `range`, replacing any
 * selection, with the conventional paste merge: the fragment's first block
 * continues the current line and its last block rejoins the trailing text.
 * Returns `{ doc, selection }` with the caret at the join. An empty fragment is
 * a no-op (returns the input doc + a collapsed caret).
 */
export function insertFragment(
  doc: RichDoc,
  range: Range,
  fragment: RichDoc,
): { doc: RichDoc; selection: Range } {
  const frag = fragment.blocks;
  const fragEmpty = frag.length === 0 || (frag.length === 1 && blockLength(frag[0]) === 0);

  const base = isCollapsed(range) ? { doc, selection: range } : deleteRange(doc, range);
  const caret = base.selection.anchor;
  if (fragEmpty) return { doc: base.doc, selection: collapsed(caret) };

  const idx = findBlockIndex(base.doc, caret.blockId);
  if (idx === -1) return { doc: base.doc, selection: collapsed(caret) };
  const B = base.doc.blocks[idx];
  const left = sliceInlines(B.inlines, 0, caret.offset);
  const right = sliceInlines(B.inlines, caret.offset, blockLength(B));

  if (frag.length === 1) {
    const merged = normalizeInlines([...left, ...frag[0].inlines, ...right]);
    const offset = caret.offset + runsLength(frag[0].inlines);
    return {
      doc: replaceBlock(base.doc, idx, { ...B, inlines: merged }),
      selection: collapsed({ blockId: B.id, offset }),
    };
  }

  const first = frag[0];
  const last = frag[frag.length - 1];
  const middle = frag.slice(1, -1).map((b) => ({ ...b, id: nextId() }));
  const bleft: Block = { ...B, inlines: normalizeInlines([...left, ...first.inlines]) };
  const bright: Block = {
    ...last,
    id: nextId(),
    inlines: normalizeInlines([...last.inlines, ...right]),
  };
  const blocks = base.doc.blocks.slice();
  blocks.splice(idx, 1, bleft, ...middle, bright);
  return {
    doc: { blocks },
    selection: collapsed({ blockId: bright.id, offset: runsLength(last.inlines) }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichText/engine/transforms.test.ts && npm run typecheck`
Expected: PASS (insertFragment + all existing transforms tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/transforms.ts packages/design-system/src/components/RichText/engine/transforms.test.ts
git commit -m "feat(RichText): insertFragment — splice a multi-block fragment at a range"
```

---

## Task 6: Public exports

**Files:**

- Modify: `packages/design-system/src/components/RichText/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add engine re-exports**

In `src/components/RichText/index.ts`, after the existing `export { ... } from './engine/transforms';` block, add:

```ts
export { fromHtml } from './engine/fromHtml';
export { fromMarkdown } from './engine/fromMarkdown';
```

- [ ] **Step 2: Add top-level re-exports**

In `src/index.ts`, in the `export { ... } from './components/RichText';` block (the one listing `emptyDoc`, `createBlock`, `docFromText`, `insertText`, …, `setBlockType`), add `fromHtml,` and `fromMarkdown,` to the list.

- [ ] **Step 3: Verify the exports resolve + typecheck + structure test**

Run: `cd packages/design-system && npm run typecheck && npm test -- src/structure.test.ts`
Expected: PASS. (structure.test enforces component dirs only; these utilities don't trigger it.)

- [ ] **Step 4: Verify the tarball still has no leaks**

Run: `cd /Users/dpws/projects/design-system && npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?'`
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/index.ts packages/design-system/src/index.ts
git commit -m "feat(RichText): export fromHtml + fromMarkdown"
```

---

## Task 7: Paste wiring in the editor

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `RichTextEditor.test.tsx` (it already mocks `readSelection` via `mockReadSelection` and wraps renders in `I18nProvider`; reuse that). Add inside the `describe('RichTextEditor toolbar', …)` block (or a new `describe('RichTextEditor paste', …)` with the same `beforeEach(() => mockReadSelection.mockReset())`):

```ts
it('rich-HTML paste inserts formatted content', async () => {
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'k', offset: 0 },
    focus: { blockId: 'k', offset: 0 },
  });
  function Harness() {
    const [doc, setDoc] = useState<RichDoc>({
      blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
    });
    return <RichTextEditor value={doc} onChange={setDoc} />;
  }
  render(
    <I18nProvider locale="en">
      <Harness />
    </I18nProvider>,
  );
  const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
  const dt = new DataTransfer();
  dt.setData('text/html', '<p>a <strong>bold</strong></p>');
  const evt = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: DataTransfer };
  Object.defineProperty(evt, 'clipboardData', { value: dt });
  editor.dispatchEvent(evt);
  expect(await screen.findByText('bold')).toBeInTheDocument();
  // The bold text renders inside a <strong>.
  expect(screen.getByText('bold').closest('strong')).not.toBeNull();
});
```

If jsdom's `DataTransfer`/`new Event('paste')` path does not deliver `clipboardData` reliably, fall back to constructing the event with a plain stub object: `const evt: any = new Event('paste', { bubbles: true, cancelable: true }); evt.clipboardData = { getData: (t: string) => (t === 'text/html' ? '<p>a <strong>bold</strong></p>' : '') }; editor.dispatchEvent(evt);` — keep the assertions identical. Do not weaken the assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx -t "rich-HTML paste"`
Expected: FAIL — paste currently inserts nothing / plain text; no `<strong>` rendered.

- [ ] **Step 3: Wire the paste handler**

In `RichTextEditor.tsx`:

1. Extend the engine import to include `fromHtml` and `insertFragment`. The file already imports from `'../RichText/engine/transforms'` (`insertText`) and may import elsewhere; add:

```tsx
import { insertText, insertFragment } from '../RichText/engine/transforms';
import { fromHtml } from '../RichText/engine/fromHtml';
```

(Keep the existing `insertText` import — just add `insertFragment` to that line, and add the `fromHtml` line.)

2. Add a `paste` listener `useEffect` next to the existing `beforeinput` effect (anywhere among the effects inside the component body):

```tsx
// Rich paste: when the clipboard carries HTML, parse it into the model and
// splice it at the selection. No HTML → don't preventDefault, so the native
// beforeinput path inserts text/plain (unchanged behavior).
useEffect(() => {
  const root = rootRef.current;
  if (!root) return;
  const onPaste = (e: ClipboardEvent) => {
    if (latest.current.readOnly) return;
    const html = e.clipboardData?.getData('text/html');
    if (!html || !html.trim()) return;
    const range = readSelection(root);
    if (!range) return;
    const fragment = fromHtml(html);
    if (isEmptyDoc(fragment)) return;
    e.preventDefault();
    commit(insertFragment(latest.current.value, range, fragment));
  };
  root.addEventListener('paste', onPaste);
  return () => root.removeEventListener('paste', onPaste);
}, [commit]);
```

(`rootRef`, `latest`, `readSelection`, `isEmptyDoc`, `commit` already exist in the component.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx && npm run typecheck`
Expected: PASS (paste test + all existing editor tests).

- [ ] **Step 5: Manual browser verification (Playwright)**

Start the playground (`make dev`), open the RichTextEditor demo, and in an editor: dispatch a synthetic paste with `text/html` `'<p>Hello <strong>world</strong> and <a href="/x">a link</a></p>'` at a caret → formatted content (bold + link) is inserted; pasting over a selection replaces it. (Real OS clipboard paste of rich content also works, but synthetic dispatch is the repeatable check.)

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): rich-HTML paste via fromHtml + insertFragment"
```

---

## Task 8: Demo + JSDoc + AGENTS.md

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx` (JSDoc only)
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add an Import example to the demo**

In `RichTextEditorDemo.tsx`:

1. Extend the import from `@eocrm/design-system` to include `fromHtml` and `fromMarkdown` (alongside the existing `RichTextEditor`, `docFromText`, `RichDoc`, …).

2. Add a state seeded from imported content, below the existing states:

```tsx
const [importDoc, setImportDoc] = useState<RichDoc>(() =>
  fromMarkdown(
    '# Imported\n\nThis editor was **seeded** from Markdown — paste rich HTML to import more.',
  ),
);
```

3. Add a new `<Example>` after the "Links" example and before "Read-only":

```tsx
<Example
  title="Import (HTML / Markdown) + rich paste"
  description="Seed the editor from stored HTML or Markdown with fromHtml / fromMarkdown, and paste rich HTML (from the web, Word, Google Docs) straight into the editor — it becomes formatted content, not plain text."
  code={`import { fromHtml, fromMarkdown } from '@eocrm/design-system';
const [doc, setDoc] = useState(() => fromMarkdown('# Imported\\n\\n- one\\n- two'));
<RichTextEditor value={doc} onChange={setDoc} toolbar />`}
>
  <RichTextEditor
    value={importDoc}
    onChange={setImportDoc}
    toolbar
    placeholder="Paste rich HTML here…"
  />
</Example>
```

- [ ] **Step 2: Verify the playground typechecks**

Run: `cd /Users/dpws/projects/design-system && make build-lib && npm run typecheck --workspace playground`
Expected: PASS.

- [ ] **Step 3: Update the component JSDoc**

In `RichTextEditor.tsx`, in the main component JSDoc description, add a sentence about paste (after the links sentence added in the previous slice):

```
 * Pasting rich HTML (web, Word, Google Docs) imports it as formatted content.
```

And in the `@remarks Anti-patterns` block, add:

```
 * - ❌ Pre-stripping pasted HTML to plain text — paste rich HTML directly; the
 *   editor parses it (sanitized) into the model. Seed stored content with
 *   `fromHtml` / `fromMarkdown`.
```

- [ ] **Step 4: Update `AGENTS.md`**

In `packages/design-system/AGENTS.md`, in the `### <RichTextEditor>` section, after the "Links" paragraph (from the previous slice), add:

```markdown
**Import:** `fromHtml(html)` and `fromMarkdown(md)` parse a string into a `RichDoc` (e.g. to seed `value` from stored/legacy content). Pasting rich HTML into the editor imports it as formatted content (parsed + sanitized). Markdown import is via `fromMarkdown` only — pasted plain text (incl. Markdown source) inserts literally. Both `from*` functions require a DOM environment (`DOMParser`); Markdown has no underline syntax and images/tables aren't modeled.
```

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(RichTextEditor): import demo example, JSDoc + AGENTS.md notes"
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

Expected: all gates green; the grep prints `0`. Then run the library **Hard-rule-8** review-fix loop (fresh-context reviewers across correctness/types, tests, a11y, API/packaging, **security of the HTML import path**) before pushing. Note: no manifest change is expected (no new component; the editor composes no new DS component) — if `make test` reports manifest drift, investigate rather than blindly regenerating.

---

## Self-review (plan vs. spec)

**Spec coverage:**

- `safeHref` extraction (shared module, renderDoc import, regression test) → Task 1. ✔
- `fromHtml` (DOMParser, block table, inline marks, inline-CSS, `<br>` split, lists→depth, whitespace, sanitization, emptyDoc) → Task 2. ✔
- `mdToHtml` (CommonMark + GFM-strike subset, fences/headings/blockquote/nested lists/paragraphs, inline, escapes, image-not-link) → Task 3. ✔
- `fromMarkdown = fromHtml(mdToHtml(...))` + lossiness → Task 4. ✔
- `insertFragment` (single/multi-block merge, delete-first, empty no-op) → Task 5. ✔
- Public exports `fromHtml`/`fromMarkdown` (both index files), `mdToHtml`/`safeHref` internal → Task 6. ✔
- Paste wiring (text/html → fromHtml → insertFragment; plain-text fallback; readOnly guard) → Task 7. ✔
- Demo + JSDoc + AGENTS.md → Task 8. ✔
- No serialize-out, no new dep, no manifest/demo-page-as-component → respected throughout.

**Placeholder scan:** every code step shows complete code; every run step has an expected result. No TBD/TODO. ✔

**Type consistency:** `fromHtml(html): RichDoc`, `mdToHtml(md): string`, `fromMarkdown(md): RichDoc`, `insertFragment(doc, range, fragment): {doc, selection}`, `safeHref(href): string|undefined` are used identically across tasks. `insertFragment` reuses the file's existing `collapsed`/`replaceBlock`/`deleteRange` and adds `runsLength`/`isCollapsed`/`nextId` imports (called out in Task 5 Step 3). The paste handler uses the real `latest.current.*`/`readSelection`/`isEmptyDoc`/`commit` names. ✔
