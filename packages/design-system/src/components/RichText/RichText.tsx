import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import type { RichDoc } from './engine/model';
import { renderDoc } from './engine/renderDoc';
import type { RenderLink } from './engine/renderLink';
import type { RenderMention } from './engine/renderMention';
import styles from './RichText.module.scss';

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** The document to render. Build one with `emptyDoc()` / `createBlock()` or the transforms. */
  value: RichDoc;
  /**
   * Substitute how a link renders. Called per link with `{ href, text }` and the
   * default `<a>` node; return your own node (e.g. a task/member chip) or the
   * `defaultNode` to keep the standard anchor. Render-time only — the document
   * model is unchanged, so serialization still emits a plain link.
   *
   * @remarks Keep it cheap — it runs on every render. Don't block on a network
   * call inside `renderLink`; return a component that fetches/caches the lookup
   * itself (or falls back to `defaultNode` while loading).
   */
  renderLink?: RenderLink;
  /**
   * Substitute how an `@`-mention renders. Called per mention with `{ id, label }`
   * and the default mention span; return your own node (e.g. an interactive member
   * chip / popover trigger) or the `defaultNode` to keep the standard
   * non-interactive span. Render-time only — the document model is unchanged, so
   * serialization still emits the mention mark. Composes with `renderLink`.
   *
   * @remarks Keep it cheap — it runs on every render. Don't block on a network
   * call inside `renderMention`; return a component that fetches/caches the lookup
   * itself (or falls back to `defaultNode` while loading).
   */
  renderMention?: RenderMention;
}

/**
 * Read-only renderer for a rich-text `RichDoc` — paragraphs, H1–H3, bullet/ordered
 * lists, blockquotes, code blocks, and inline marks (bold/italic/underline/strike/
 * code/link) — using the in-house engine (no editor libraries).
 *
 * This is the read-only half of the rich-text story: it **displays** stored rich
 * content (activity feeds, comments, audit views). Editing arrives later as
 * `<RichTextEditor>`.
 *
 * @example
 * // Display a document.
 * const doc = docFromText('Hello world');
 * <RichText value={doc} />;
 *
 * @example
 * // Build structured content with the engine constructors.
 * const doc = { blocks: [
 *   createBlock('heading', 'Notes', { level: 2 }),
 *   createBlock('paragraph', 'See the docs.'),
 * ] };
 * <RichText value={doc} />;
 *
 * @remarks When NOT to use
 * - Plain, unformatted text → use `<Text>`.
 * - Editing rich text → not yet; `<RichTextEditor>` is a later slice.
 *
 * @remarks Anti-patterns
 * - ❌ Mutating a `RichDoc` in place — every engine transform is immutable; render
 *   the returned doc.
 * - ❌ Hand-writing HTML to display rich content — feed a `RichDoc` to `<RichText>`.
 */
export const RichText = forwardRef<HTMLDivElement, RichTextProps>(function RichText(
  { value, renderLink, renderMention, className, ...props },
  ref,
) {
  // {...props} last so the consumer can override anything except the composed
  // className (Pattern A — consumer wins).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {renderDoc(value, { renderLink, renderMention })}
    </div>
  );
});
