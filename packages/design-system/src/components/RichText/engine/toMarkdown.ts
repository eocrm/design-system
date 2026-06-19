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
