// toHtml.ts — serialize a RichDoc to a compact HTML string. The inverse of
// fromHtml; mirrors renderDoc's structure (block elements, mark nesting order,
// list-depth grouping) but emits a string. Text/attributes are escaped and hrefs
// run through safeHref, so output is injection-safe. Lossless for the model
// (underline → <u>), so fromHtml(toHtml(doc)) reproduces the document.
import type { RichDoc, Block, Inline, Mark, MarkType } from './model';
import { runsText } from './inlines';
import { escapeHtml, escapeAttr } from './escape';
import { safeHref } from './safeHref';
import { textColorVar, bgColorVar } from './colorMarks';
import { isListItem, effectiveDepths } from './listDepths';
import { attachmentIsImage } from './attachment';
import { MARK_ORDER } from './marks';

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
    case 'textColor': {
      // Resolve the palette key to a token-backed var; an unknown key drops the
      // wrapper (never emit an empty/bogus style). The value is from a fixed
      // allowlist, so it needs no attribute escaping.
      const value = mark.type === 'textColor' ? textColorVar(mark.color) : undefined;
      return value ? `<span style="color:${value}">${inner}</span>` : inner;
    }
    case 'bgColor': {
      const value = mark.type === 'bgColor' ? bgColorVar(mark.color) : undefined;
      return value ? `<span style="background-color:${value}">${inner}</span>` : inner;
    }
    case 'link': {
      const safe = mark.type === 'link' ? safeHref(mark.href) : undefined;
      if (safe === undefined) return inner; // unsafe href → drop the anchor, keep text
      return `<a href="${escapeAttr(safe)}" rel="noopener noreferrer">${inner}</a>`;
    }
    case 'mention': {
      if (mark.type !== 'mention') return inner;
      return `<span data-mention-id="${escapeAttr(mark.id)}" data-mention-label="${escapeAttr(mark.label)}">${inner}</span>`;
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
    case 'heading': {
      // Clamp to the model's h1–h3 range so a hand-built doc with an out-of-range
      // level never emits a malformed <undefined>/<h0> tag.
      const tag = `h${Math.min(3, Math.max(1, block.level ?? 1))}`;
      return `<${tag}>${inlines(block)}</${tag}>`;
    }
    case 'blockquote':
      return `<blockquote>${inlines(block)}</blockquote>`;
    case 'code_block':
      return `<pre><code>${escapeHtml(runsText(block.inlines))}</code></pre>`;
    case 'attachment': {
      // Only finalized (ready/absent-status) attachments serialize; in-flight or
      // failed uploads emit nothing.
      if (block.status && block.status !== 'ready') return '';
      const safe = safeHref(block.src ?? '');
      if (safe === undefined) return '';
      if (attachmentIsImage(block)) {
        const alt = escapeAttr(block.alt ?? block.name ?? '');
        const widthAttr = typeof block.width === 'number' ? ` width="${block.width}"` : '';
        const heightAttr = typeof block.height === 'number' ? ` height="${block.height}"` : '';
        const figStyle =
          block.align === 'center' || block.align === 'right'
            ? ` style="text-align:${block.align}"`
            : '';
        return `<figure${figStyle}><img src="${escapeAttr(safe)}" alt="${alt}"${widthAttr}${heightAttr}></figure>`;
      }
      return `<a href="${escapeAttr(safe)}" download>${escapeHtml(block.name ?? safe)}</a>`;
    }
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
 * @remarks An unsafe href (rejected by `safeHref`) drops the `<a>` wrapper and
 * emits the bare text — unlike `renderDoc`, which keeps a hrefless `<a>`. Both are
 * safe and `fromHtml(toHtml(doc))` stays consistent (neither yields a link mark).
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
