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
