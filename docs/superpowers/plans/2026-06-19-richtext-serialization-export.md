# RichTextEditor — Serialization / Export slice (Slice 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `toHtml(doc)` / `toMarkdown(doc)` serializers to the RichText engine — the inverse of `fromHtml`/`fromMarkdown`.

**Architecture:** Two behavior-preserving extractions (HTML escapers → `escape.ts`; list-depth helpers → `listDepths.ts`) shared by the existing renderer/parser and the new serializers, then two pure string builders. No editor changes, no new dependency.

**Tech Stack:** TypeScript, React 19, Vitest (jsdom — `globals: true`, do NOT import `describe`/`it`/`expect`/`vi`).

**Spec:** `docs/superpowers/specs/2026-06-19-richtext-serialization-export-design.md`

---

## Context

- **Model** (`engine/model.ts`): `RichDoc = { blocks: Block[] }`; `Block = { id; type; level?; depth?; inlines }`; `Inline = { text; marks: Mark[] }`; `Mark` flags + `{type:'link'; href}`. `runsText(inlines)` from `engine/inlines.ts` concatenates run text.
- **`safeHref(href): string|undefined`** from `engine/safeHref.ts` — relative/http(s)/mailto/tel kept; javascript:/data:/protocol-relative/tab-obfuscated → undefined.
- **Existing private helpers to extract:** `escapeHtml`/`escapeAttr` in `engine/mdToHtml.ts` (top); `effectiveDepths`/`isListItem` in `engine/renderDoc.tsx`. `renderDoc`'s `MARK_ORDER = ['link','bold','italic','underline','strike','code']` and `wrapMark` define the mark nesting the serializer mirrors.
- **Exports:** engine functions are re-exported from `components/RichText/index.ts`, which `src/index.ts` re-exports. Add new functions in BOTH (as the import slice did for `fromHtml`/`fromMarkdown`).
- **Run one file:** `cd packages/design-system && npm test -- src/components/RichText/engine/<file>`. Full gate (root): `make test && make build-lib && make lint && npm run format:check`.
- `structure.test.ts` four-file rule applies only to `components/<Name>/` dirs — engine modules are exempt.

## File structure

- **Create** `engine/escape.ts` (+ `escape.test.ts`); **modify** `engine/mdToHtml.ts` to import it.
- **Create** `engine/listDepths.ts` (+ `listDepths.test.ts`); **modify** `engine/renderDoc.tsx` to import it.
- **Create** `engine/toHtml.ts` (+ `toHtml.test.ts`), `engine/toMarkdown.ts` (+ `toMarkdown.test.ts`), `engine/serializeRoundtrip.test.ts`.
- **Modify** `components/RichText/index.ts` + `src/index.ts` (export `toHtml`/`toMarkdown`).
- **Modify** demo + `RichText`/`RichTextEditor` JSDoc + `AGENTS.md`.

---

## Task 1: Extract `escape.ts`

**Files:** Create `engine/escape.ts` + `escape.test.ts`; modify `engine/mdToHtml.ts`.

- [ ] **Step 1: Write `escape.test.ts`**

```ts
import { escapeHtml, escapeAttr } from './escape';

describe('escape', () => {
  it('escapeHtml escapes & < >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
  it('escapeAttr escapes & < > and quotes', () => {
    expect(escapeAttr(`a"b'c&d<e>f`)).toBe('a&quot;b&#39;c&amp;d&lt;e&gt;f');
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npm test -- src/components/RichText/engine/escape.test.ts`; module not found).

- [ ] **Step 3: Create `escape.ts`** (verbatim from `mdToHtml.ts`)

```ts
// escape.ts — HTML text/attribute escapers shared by the Markdown converter
// (mdToHtml) and the HTML serializer (toHtml).
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
/** Escape text content: `&`, `<`, `>`. */
export const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ESC[c]);

// Attribute context also needs the quotes escaped (a `"` in a URL would break out
// of the href). Scheme safety is handled separately by safeHref.
const ATTR_ESC: Record<string, string> = { ...ESC, '"': '&quot;', "'": '&#39;' };
/** Escape an attribute value: text escapes plus quotes. */
export const escapeAttr = (s: string): string => s.replace(/["'&<>]/g, (c) => ATTR_ESC[c]);
```

- [ ] **Step 4: Update `mdToHtml.ts`** — delete the local `ESC`/`escapeHtml`/`ATTR_ESC`/`escapeAttr` (the 8 lines at the top) and add near the other imports: `import { escapeHtml, escapeAttr } from './escape';`

- [ ] **Step 5: Verify** — `npm test -- src/components/RichText/engine/escape.test.ts src/components/RichText/engine/mdToHtml.test.ts && npm run typecheck` → PASS (mdToHtml tests still green through the imported escapers).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/escape.ts packages/design-system/src/components/RichText/engine/escape.test.ts packages/design-system/src/components/RichText/engine/mdToHtml.ts
git commit -m "refactor(RichText): extract HTML escapers to engine/escape"
```

---

## Task 2: Extract `listDepths.ts`

**Files:** Create `engine/listDepths.ts` + `listDepths.test.ts`; modify `engine/renderDoc.tsx`.

- [ ] **Step 1: Write `listDepths.test.ts`**

```ts
import { isListItem, effectiveDepths } from './listDepths';
import { createBlock } from './model';
import type { Block } from './model';

const li = (depth: number): Block => createBlock('bullet_item', 'x', { depth });
const p = (): Block => createBlock('paragraph', 'x');

describe('isListItem', () => {
  it('is true for list items only', () => {
    expect(isListItem(createBlock('bullet_item', 'a'))).toBe(true);
    expect(isListItem(createBlock('ordered_item', 'a'))).toBe(true);
    expect(isListItem(createBlock('paragraph', 'a'))).toBe(false);
  });
});

describe('effectiveDepths', () => {
  it('clamps gaps to at most +1 within a run', () => {
    expect(effectiveDepths([li(0), li(2), li(1)])).toEqual([0, 1, 1]);
  });
  it('clamps a leading deep item to 0', () => {
    expect(effectiveDepths([li(3)])).toEqual([0]);
  });
  it('resets the run on a non-list block', () => {
    expect(effectiveDepths([li(0), li(1), p(), li(2)])).toEqual([0, 1, 0, 0]);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Create `listDepths.ts`** (verbatim from `renderDoc.tsx`)

```ts
// listDepths.ts — list-item detection + gap-free depth normalization, shared by
// the renderer (renderDoc) and the HTML serializer (toHtml) so both reconstruct
// list nesting identically.
import type { Block } from './model';

/** True for the flat list-item block types. */
export function isListItem(block: Block): boolean {
  return block.type === 'bullet_item' || block.type === 'ordered_item';
}

/**
 * Effective render depth per block. `depth` is a free integer on the model, but
 * nesting needs gap-free levels — within each run of consecutive list items,
 * clamp each item to at most one level deeper than the previous (never below 0).
 * Non-list blocks get 0 and reset the run. Lossless: no item is dropped during
 * grouping.
 */
export function effectiveDepths(blocks: Block[]): number[] {
  const eff = new Array<number>(blocks.length).fill(0);
  let prev = -1; // effective depth of the previous list item in the current run
  for (let i = 0; i < blocks.length; i += 1) {
    if (!isListItem(blocks[i])) {
      prev = -1;
      continue;
    }
    const raw = blocks[i].depth ?? 0;
    const e = Math.max(0, Math.min(raw, prev + 1));
    eff[i] = e;
    prev = e;
  }
  return eff;
}
```

- [ ] **Step 4: Update `renderDoc.tsx`** — delete the local `isListItem` and `effectiveDepths` functions (keep `ListItemNode`, `collectList`, `renderListTree`), and add to the imports: `import { isListItem, effectiveDepths } from './listDepths';`

- [ ] **Step 5: Verify** — `npm test -- src/components/RichText/engine/listDepths.test.ts src/components/RichText/engine/renderDoc.test.tsx && npm run typecheck` → PASS (renderDoc list tests still green).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/listDepths.ts packages/design-system/src/components/RichText/engine/listDepths.test.ts packages/design-system/src/components/RichText/engine/renderDoc.tsx
git commit -m "refactor(RichText): extract list-depth helpers to engine/listDepths"
```

---

## Task 3: `toHtml`

**Files:** Create `engine/toHtml.ts` + `toHtml.test.ts`.

- [ ] **Step 1: Write `toHtml.test.ts`**

```ts
import { toHtml } from './toHtml';
import { createBlock } from './model';
import type { RichDoc, Block, Inline } from './model';

const para = (id: string, inlines: Inline[]): Block => ({ id, type: 'paragraph', inlines });
const link = (href: string) => ({ type: 'link' as const, href });

describe('toHtml — blocks', () => {
  it('serializes headings, paragraph, blockquote, code_block', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: 'a' }),
        createBlock('paragraph', 'p', { id: 'b' }),
        createBlock('blockquote', 'q', { id: 'c' }),
        createBlock('code_block', 'a < b', { id: 'd' }),
      ],
    };
    expect(toHtml(doc)).toBe(
      '<h2>H</h2><p>p</p><blockquote>q</blockquote><pre><code>a &lt; b</code></pre>',
    );
  });

  it('groups nested list items into ul/ol with nested li', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
        createBlock('bullet_item', 'c', { id: '3', depth: 0 }),
      ],
    };
    expect(toHtml(doc)).toBe('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
  });

  it('uses <ol> for ordered items', () => {
    expect(toHtml({ blocks: [createBlock('ordered_item', 'a', { id: '1' })] })).toBe(
      '<ol><li>a</li></ol>',
    );
  });

  it('serializes an empty paragraph as <p></p>', () => {
    expect(toHtml({ blocks: [createBlock('paragraph', '', { id: 'a' })] })).toBe('<p></p>');
  });
});

describe('toHtml — inline marks', () => {
  it('nests marks link-outermost, code-innermost', () => {
    const doc: RichDoc = {
      blocks: [para('a', [{ text: 'x', marks: [link('/u'), { type: 'bold' }, { type: 'code' }] }])],
    };
    expect(toHtml(doc)).toBe(
      '<p><a href="/u" rel="noopener noreferrer"><strong><code>x</code></strong></a></p>',
    );
  });

  it('maps every mark tag including underline', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'b', marks: [{ type: 'bold' }] },
          { text: 'i', marks: [{ type: 'italic' }] },
          { text: 'u', marks: [{ type: 'underline' }] },
          { text: 's', marks: [{ type: 'strike' }] },
        ]),
      ],
    };
    expect(toHtml(doc)).toBe('<p><strong>b</strong><em>i</em><u>u</u><s>s</s></p>');
  });

  it('escapes text and the href, and drops an unsafe-href anchor (keeping text)', () => {
    expect(toHtml({ blocks: [para('a', [{ text: 'a<b>&"', marks: [] }])] })).toBe(
      '<p>a&lt;b&gt;&amp;"</p>',
    );
    expect(
      toHtml({ blocks: [para('a', [{ text: 't', marks: [link('javascript:alert(1)')] }])] }),
    ).toBe('<p>t</p>');
    expect(toHtml({ blocks: [para('a', [{ text: 't', marks: [link('/a b')] }])] })).toBe(
      '<p><a href="/a b" rel="noopener noreferrer">t</a></p>',
    );
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `toHtml.ts`**

```ts
// toHtml.ts — serialize a RichDoc to a compact HTML string. The inverse of
// fromHtml; mirrors renderDoc's structure (block elements, mark nesting order,
// list-depth grouping) but emits a string. Text/attributes are escaped and hrefs
// run through safeHref, so output is injection-safe. Lossless for the model
// (underline → <u>), so fromHtml(toHtml(doc)) reproduces the document.
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';
import { runsText } from './inlines';
import { escapeHtml, escapeAttr } from './escape';
import { safeHref } from './safeHref';
import { isListItem, effectiveDepths } from './listDepths';

// Outer → inner; link outermost, code innermost (matches renderDoc).
const MARK_ORDER: MarkType[] = ['link', 'bold', 'italic', 'underline', 'strike', 'code'];
const HEADING_TAG: Record<1 | 2 | 3, string> = { 1: 'h1', 2: 'h2', 3: 'h3' };

/** Wrap an already-escaped HTML string in one mark's tag. */
function wrapMark(type: MarkType, mark: Mark, inner: string): string {
  switch (type) {
    case 'bold':
      return `<strong>${inner}</strong>`;
    case 'italic':
      return `<em>${inner}</em>`;
    case 'underline':
      return `<u>${inner}</u>`;
    case 'strike':
      return `<s>${inner}</s>`;
    case 'code':
      return `<code>${inner}</code>`;
    case 'link': {
      const safe = mark.type === 'link' ? safeHref(mark.href) : undefined;
      if (safe === undefined) return inner; // unsafe href → drop the anchor, keep text
      return `<a href="${escapeAttr(safe)}" rel="noopener noreferrer">${inner}</a>`;
    }
    default:
      return inner;
  }
}

/** Serialize one inline run: escaped text wrapped innermost-first. */
function inlineRun(run: Inline): string {
  const present = MARK_ORDER.filter((t) => run.marks.some((m) => m.type === t));
  let html = escapeHtml(run.text);
  for (let i = present.length - 1; i >= 0; i -= 1) {
    const type = present[i];
    const mark = run.marks.find((m) => m.type === type)!;
    html = wrapMark(type, mark, html);
  }
  return html;
}

const inlines = (block: Block): string => block.inlines.map(inlineRun).join('');

/** Serialize a contiguous run of list items starting at `start` (its base depth). */
function listHtml(blocks: Block[], start: number, eff: number[]): [string, number] {
  const base = eff[start];
  const tag = blocks[start].type === 'ordered_item' ? 'ol' : 'ul';
  const items: string[] = [];
  let i = start;
  while (i < blocks.length && isListItem(blocks[i])) {
    const d = eff[i];
    if (d < base) break;
    if (d > base) {
      const [child, next] = listHtml(blocks, i, eff);
      if (items.length > 0) {
        items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${child}</li>`);
      }
      i = next;
      continue;
    }
    items.push(`<li>${inlines(blocks[i])}</li>`);
    i += 1;
  }
  return [`<${tag}>${items.join('')}</${tag}>`, i];
}

function blockHtml(block: Block): string {
  switch (block.type) {
    case 'heading':
      return `<${HEADING_TAG[block.level ?? 1]}>${inlines(block)}</${HEADING_TAG[block.level ?? 1]}>`;
    case 'blockquote':
      return `<blockquote>${inlines(block)}</blockquote>`;
    case 'code_block':
      return `<pre><code>${escapeHtml(runsText(block.inlines))}</code></pre>`;
    case 'paragraph':
    default:
      return `<p>${inlines(block)}</p>`;
  }
}

/**
 * Serialize a `RichDoc` to a compact HTML string (the inverse of `fromHtml`).
 * Text and attributes are escaped and hrefs run through `safeHref`, so the output
 * is injection-safe. Lossless for the model — `fromHtml(toHtml(doc))` reproduces
 * the document structurally.
 *
 * @example
 * const html = toHtml(doc); // '<h2>Title</h2><p>Hello <strong>world</strong></p>'
 */
export function toHtml(doc: RichDoc): string {
  const eff = effectiveDepths(doc.blocks);
  let out = '';
  let i = 0;
  while (i < doc.blocks.length) {
    if (isListItem(doc.blocks[i])) {
      const [html, next] = listHtml(doc.blocks, i, eff);
      out += html;
      i = next;
    } else {
      out += blockHtml(doc.blocks[i]);
      i += 1;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS** (`npm test -- src/components/RichText/engine/toHtml.test.ts && npm run typecheck`).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toHtml.ts packages/design-system/src/components/RichText/engine/toHtml.test.ts
git commit -m "feat(RichText): toHtml — serialize the model to HTML"
```

---

## Task 4: `toMarkdown`

**Files:** Create `engine/toMarkdown.ts` + `toMarkdown.test.ts`.

- [ ] **Step 1: Write `toMarkdown.test.ts`**

````ts
import { toMarkdown } from './toMarkdown';
import { createBlock } from './model';
import type { RichDoc, Block, Inline } from './model';

const para = (id: string, inlines: Inline[]): Block => ({ id, type: 'paragraph', inlines });
const link = (href: string) => ({ type: 'link' as const, href });

describe('toMarkdown — blocks', () => {
  it('serializes headings, paragraph, blockquote, code fence', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('heading', 'H', { level: 2, id: 'a' }),
        createBlock('paragraph', 'p', { id: 'b' }),
        createBlock('blockquote', 'q', { id: 'c' }),
        createBlock('code_block', 'code', { id: 'd' }),
      ],
    };
    expect(toMarkdown(doc)).toBe('## H\n\np\n\n> q\n\n```\ncode\n```');
  });

  it('serializes nested lists with 2-space indentation, consecutive items joined', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('bullet_item', 'a', { id: '1', depth: 0 }),
        createBlock('bullet_item', 'b', { id: '2', depth: 1 }),
        createBlock('ordered_item', 'c', { id: '3', depth: 0 }),
      ],
    };
    // bullet then ordered at depth 0 are adjacent list items → single-newline joined
    expect(toMarkdown(doc)).toBe('- a\n  - b\n1. c');
  });
});

describe('toMarkdown — inline', () => {
  it('wraps marks and drops underline', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'b', marks: [{ type: 'bold' }] },
          { text: ' ', marks: [] },
          { text: 'i', marks: [{ type: 'italic' }] },
          { text: ' ', marks: [] },
          { text: 's', marks: [{ type: 'strike' }] },
          { text: ' ', marks: [] },
          { text: 'c', marks: [{ type: 'code' }] },
          { text: ' ', marks: [] },
          { text: 'u', marks: [{ type: 'underline' }] },
        ]),
      ],
    };
    expect(toMarkdown(doc)).toBe('**b** *i* ~~s~~ `c` u');
  });

  it('serializes a link with its (safe) href', () => {
    expect(toMarkdown({ blocks: [para('a', [{ text: 'docs', marks: [link('/u')] }])] })).toBe(
      '[docs](/u)',
    );
  });

  it('escapes inline markdown specials and a leading block marker', () => {
    expect(toMarkdown({ blocks: [para('a', [{ text: 'a*b_c', marks: [] }])] })).toBe('a\\*b\\_c');
    expect(toMarkdown({ blocks: [para('a', [{ text: '# not a heading', marks: [] }])] })).toBe(
      '\\# not a heading',
    );
  });
});
````

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `toMarkdown.ts`**

````ts
// toMarkdown.ts — serialize a RichDoc to Markdown (CommonMark + GFM strikethrough,
// restricted to the model). The inverse of fromMarkdown. Lossy: underline has no
// Markdown syntax and is dropped — use toHtml for full fidelity.
import type { RichDoc, Block, Inline, MarkType } from './model';
import { runsText } from './inlines';
import { safeHref } from './safeHref';
import { isListItem, effectiveDepths } from './listDepths';

/** Backslash-escape inline specials so literal chars don't become formatting. */
function escapeMd(s: string): string {
  return s.replace(/[\\*_`[\]]/g, (c) => `\\${c}`);
}

/** Escape a leading block marker at the very start of the content. */
function escapeLineStart(s: string): string {
  return s.replace(/^(\s*)([#>+-]|\d+\.)/, '$1\\$2');
}

// Inline marks innermost → outermost (link applied last, outermost).
const MARKERS: { type: MarkType; open: string; close: string }[] = [
  { type: 'code', open: '`', close: '`' },
  { type: 'strike', open: '~~', close: '~~' },
  { type: 'italic', open: '*', close: '*' },
  { type: 'bold', open: '**', close: '**' },
];

function inlineRun(run: Inline): string {
  const isCode = run.marks.some((m) => m.type === 'code');
  // Code content is verbatim; other text is MD-escaped.
  let text = isCode ? run.text : escapeMd(run.text);
  for (const m of MARKERS) {
    if (run.marks.some((mk) => mk.type === m.type)) text = `${m.open}${text}${m.close}`;
  }
  const linkMark = run.marks.find((m) => m.type === 'link');
  if (linkMark && linkMark.type === 'link') text = `[${text}](${safeHref(linkMark.href) ?? ''})`;
  return text;
}

function blockMd(block: Block, depth: number): string {
  if (block.type === 'code_block') return '```\n' + runsText(block.inlines) + '\n```';
  const inline = escapeLineStart(block.inlines.map(inlineRun).join(''));
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level ?? 1)} ${inline}`;
    case 'blockquote':
      return `> ${inline}`;
    case 'bullet_item':
      return `${'  '.repeat(depth)}- ${inline}`;
    case 'ordered_item':
      return `${'  '.repeat(depth)}1. ${inline}`;
    case 'paragraph':
    default:
      return inline;
  }
}

/**
 * Serialize a `RichDoc` to Markdown (CommonMark + GFM strikethrough), the inverse
 * of `fromMarkdown`. Lossy: **underline is dropped** (no Markdown syntax — use
 * `toHtml` for full fidelity); images/tables aren't modeled; MD-special escaping
 * is best-effort.
 *
 * @example
 * const md = toMarkdown(doc); // '# Title\n\n- one\n- two'
 */
export function toMarkdown(doc: RichDoc): string {
  const eff = effectiveDepths(doc.blocks);
  let out = '';
  for (let i = 0; i < doc.blocks.length; i += 1) {
    const b = doc.blocks[i];
    if (i > 0) {
      // Consecutive list items stay in one list (single newline); else a blank line.
      out += isListItem(doc.blocks[i - 1]) && isListItem(b) ? '\n' : '\n\n';
    }
    out += blockMd(b, isListItem(b) ? eff[i] : 0);
  }
  return out;
}
````

- [ ] **Step 4: Run → PASS** (`npm test -- src/components/RichText/engine/toMarkdown.test.ts && npm run typecheck`). If the nested-list or escaping cases fail, debug the implementation (do not weaken tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toMarkdown.ts packages/design-system/src/components/RichText/engine/toMarkdown.test.ts
git commit -m "feat(RichText): toMarkdown — serialize the model to Markdown"
```

---

## Task 5: Round-trip tests

**Files:** Create `engine/serializeRoundtrip.test.ts`.

- [ ] **Step 1: Write the round-trip test** (the strongest correctness guarantee — `from∘to` reproduces the model)

```ts
import { toHtml } from './toHtml';
import { toMarkdown } from './toMarkdown';
import { fromHtml } from './fromHtml';
import { fromMarkdown } from './fromMarkdown';
import { createBlock } from './model';
import type { RichDoc, Block } from './model';

// Strip ids (parsers mint fresh ones) for structural comparison.
const shape = (d: RichDoc) =>
  d.blocks.map((b: Block) => ({
    type: b.type,
    ...(b.level !== undefined ? { level: b.level } : {}),
    ...(b.depth !== undefined ? { depth: b.depth } : {}),
    inlines: b.inlines,
  }));

const doc: RichDoc = {
  blocks: [
    createBlock('heading', 'Title', { level: 2, id: 'a' }),
    {
      id: 'b',
      type: 'paragraph',
      inlines: [
        { text: 'see ', marks: [] },
        { text: 'docs', marks: [{ type: 'link', href: '/x' }, { type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'code', marks: [{ type: 'code' }] },
      ],
    },
    createBlock('blockquote', 'quote', { id: 'c' }),
    createBlock('bullet_item', 'a', { id: 'd', depth: 0 }),
    createBlock('bullet_item', 'b', { id: 'e', depth: 1 }),
    createBlock('code_block', 'x = 1', { id: 'f' }),
  ],
};

describe('serialize round-trip', () => {
  it('fromHtml(toHtml(doc)) reproduces the document (underline included)', () => {
    const withU: RichDoc = {
      blocks: [
        { id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] },
      ],
    };
    expect(shape(fromHtml(toHtml(withU)))).toEqual(shape(withU));
    expect(shape(fromHtml(toHtml(doc)))).toEqual(shape(doc));
  });

  it('fromMarkdown(toMarkdown(doc)) reproduces the document except underline', () => {
    expect(shape(fromMarkdown(toMarkdown(doc)))).toEqual(shape(doc));
    // underline is dropped by the Markdown round-trip:
    const withU: RichDoc = {
      blocks: [
        { id: 'u', type: 'paragraph', inlines: [{ text: 'u', marks: [{ type: 'underline' }] }] },
      ],
    };
    expect(shape(fromMarkdown(toMarkdown(withU)))).toEqual([
      { type: 'paragraph', inlines: [{ text: 'u', marks: [] }] },
    ]);
  });
});
```

- [ ] **Step 2: Run** — `npm test -- src/components/RichText/engine/serializeRoundtrip.test.ts`. Expect PASS. If a structural mismatch appears (e.g. mark ORDER differs after the round-trip), note that `marksEqual` is order-insensitive but `toEqual` on the `marks` array is order-SENSITIVE — if needed, sort marks by `type` in `shape` before comparing (adjust the helper, not the serializers). Do not weaken the round-trip guarantee itself.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/serializeRoundtrip.test.ts
git commit -m "test(RichText): serialize round-trip (from∘to reproduces the model)"
```

---

## Task 6: Public exports

**Files:** Modify `components/RichText/index.ts`, `src/index.ts`.

- [ ] **Step 1** — In `src/components/RichText/index.ts`, after the existing `export { fromHtml } … export { fromMarkdown } …` lines, add:

```ts
export { toHtml } from './engine/toHtml';
export { toMarkdown } from './engine/toMarkdown';
```

- [ ] **Step 2** — In `src/index.ts`, add `toHtml,` and `toMarkdown,` to the `export { … fromHtml, fromMarkdown } from './components/RichText';` list.

- [ ] **Step 3: Verify** — `npm run typecheck && npm test -- src/structure.test.ts` → PASS. Tarball check (root): `npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?'` → `0`.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/RichText/index.ts packages/design-system/src/index.ts
git commit -m "feat(RichText): export toHtml + toMarkdown"
```

---

## Task 7: Demo + JSDoc + AGENTS.md

**Files:** Modify `packages/playground/src/pages/components/RichTextEditorDemo.tsx`, `RichTextEditor.tsx` JSDoc, `RichText.tsx` JSDoc (if it lists serialization), `AGENTS.md`.

- [ ] **Step 1: Demo — show the live serialized output.** In `RichTextEditorDemo.tsx`:
  1. Extend the `@eocrm/design-system` import to include `toHtml`, `toMarkdown`, and `Code` (if not already imported; if `Code` isn't available, use `Text`).
  2. In the "Editable with toolbar" example, below the editor, render the serialized forms of the live `doc` (the existing first-editor state). Add inside that example's children, after the `<RichTextEditor>`:

```tsx
          <Text size="sm" tone="muted">
            HTML: <code>{toHtml(doc)}</code>
          </Text>
          <Text size="sm" tone="muted">
            Markdown: <code>{toMarkdown(doc).replace(/\n/g, '⏎')}</code>
          </Text>
```

(Use the example's existing `doc` state. If that example doesn't have a `Stack` wrapper, wrap the editor + these two lines in `<Stack gap="sm">`. Keep it minimal — this demonstrates the real serializers against the live editor.)

- [ ] **Step 2: Verify the playground builds** — `cd /Users/dpws/projects/design-system && make build-lib && npm run typecheck --workspace playground`. If `format:check` flags the edited files, `npx prettier --write` them.

- [ ] **Step 3: JSDoc** — in `RichTextEditor.tsx`'s component JSDoc `@remarks Anti-patterns`, add:

```
 * - ❌ Hand-rolling HTML/Markdown from the model — use `toHtml` / `toMarkdown`
 *   (the inverse of `fromHtml` / `fromMarkdown`).
```

- [ ] **Step 4: AGENTS.md** — in the `### <RichTextEditor>` section, after the "**Import:**" paragraph, add:

```markdown
**Export:** `toHtml(doc)` and `toMarkdown(doc)` serialize a `RichDoc` back to a string (the inverse of `fromHtml`/`fromMarkdown`) — e.g. for storage, email bodies, or display outside the editor. `toHtml` is lossless (`fromHtml(toHtml(doc))` round-trips); `toMarkdown` drops underline (no Markdown syntax — use `toHtml` for full fidelity). Both escape output and run hrefs through `safeHref`.
```

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(RichText): serialize-out demo, JSDoc + AGENTS.md"
```

---

## Final gate (before the Rule-8 review loop + PR)

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

All green; grep `0`. No manifest drift (no new component). Then run the library Hard-rule-8 review-fix loop (esp. **security** — confirm serialized HTML can't carry an unsafe href/injection — and the round-trip fidelity).

---

## Self-review (plan vs. spec)

**Spec coverage:** `escape.ts` extract (Task 1) ✔; `listDepths.ts` extract (Task 2) ✔; `toHtml` block/list/inline/escaping/safeHref/underline-as-`<u>`/empty (Task 3) ✔; `toMarkdown` blocks/inline/underline-dropped/escaping/code-fence (Task 4) ✔; round-trip from∘to (Task 5) ✔; exports (Task 6) ✔; demo + JSDoc + AGENTS.md (Task 7) ✔; no component/manifest/editor change — respected.

**Placeholder scan:** complete code in every step; expected results on every command; no TBD. ✔

**Type consistency:** `toHtml(doc): string`, `toMarkdown(doc): string`, `escapeHtml`/`escapeAttr`, `isListItem`/`effectiveDepths`, `MARK_ORDER`, `safeHref` used identically across tasks. The serializers reuse the SAME `effectiveDepths`/`isListItem`/`safeHref`/escapers as the renderer/parser, so list grouping + sanitization can't diverge. ✔
