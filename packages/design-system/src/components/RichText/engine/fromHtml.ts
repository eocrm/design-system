// fromHtml.ts — parse an HTML string into the RichText model. Uses the browser's
// built-in DOMParser (inert: scripts never run) and walks the DOM with a strict
// allowlist — the walk IS the sanitizer, since it only extracts text + known
// marks + safeHref-checked links and emits a plain model. Requires a DOM
// environment (browser; jsdom in tests).
import type { RichDoc, Block, Inline, Mark, BlockType } from './model';
import { nextId, emptyDoc } from './model';
import { normalizeInlines } from './inlines';
import { safeHref } from './safeHref';
import { withMark } from './marks';

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

const HTML_NS = 'http://www.w3.org/1999/xhtml';
// Only HTML-namespace elements are walked; SVG/MathML foreign content (which has
// lowercase tagNames the uppercase allowlists would miss) is dropped entirely.
const isElement = (n: Node): n is HTMLElement =>
  n.nodeType === 1 && (n as Element).namespaceURI === HTML_NS;
const isText = (n: Node): n is Text => n.nodeType === 3;

const collapseWs = (s: string): string => s.replace(/\s+/g, ' ');

/** Marks active for the descendants of `el`: parent ∪ tag mark ∪ link ∪ inline CSS. */
function marksFor(el: HTMLElement, parent: Mark[]): Mark[] {
  let marks = parent;
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      marks = withMark(marks, { type: 'bold' });
      break;
    case 'EM':
    case 'I':
      marks = withMark(marks, { type: 'italic' });
      break;
    case 'U':
      marks = withMark(marks, { type: 'underline' });
      break;
    case 'S':
    case 'DEL':
    case 'STRIKE':
      marks = withMark(marks, { type: 'strike' });
      break;
    case 'CODE':
      marks = withMark(marks, { type: 'code' });
      break;
    case 'A': {
      const href = safeHref(el.getAttribute('href') ?? '');
      if (href !== undefined) marks = withMark(marks, { type: 'link', href });
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
    marks = withMark(marks, { type: 'bold' });
  }
  if (/font-style\s*:\s*(italic|oblique)/.test(s)) marks = withMark(marks, { type: 'italic' });
  const deco = /text-decoration(?:-line)?\s*:\s*([^;]+)/.exec(s);
  if (deco) {
    if (deco[1].includes('underline')) marks = withMark(marks, { type: 'underline' });
    if (deco[1].includes('line-through')) marks = withMark(marks, { type: 'strike' });
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
    for (const b of inner) out.push({ id: nextId(), type: 'blockquote', inlines: b.inlines });
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
  // DOMParser disables scripting, so <noscript> children are promoted into the
  // tree as real elements — remove them so their content isn't extracted.
  parsed.body.querySelectorAll('noscript').forEach((el) => el.remove());
  const blocks: Block[] = [];
  collectBlocks(parsed.body, blocks, 0);
  return blocks.length ? { blocks } : emptyDoc();
}
