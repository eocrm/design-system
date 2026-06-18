import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import type { RichDoc } from './engine/model';
import { renderDoc } from './engine/renderDoc';
import styles from './RichText.module.scss';

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** The document to render. Build one with `emptyDoc()` / `createBlock()` or the transforms. */
  value: RichDoc;
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
  { value, className, ...props },
  ref,
) {
  // {...props} last so the consumer can override anything except the composed
  // className (Pattern A — consumer wins).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {renderDoc(value)}
    </div>
  );
});
