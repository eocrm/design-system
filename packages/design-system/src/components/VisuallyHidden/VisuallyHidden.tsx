import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './VisuallyHidden.module.scss';

/** Element VisuallyHidden renders. `'span'` (default) for inline text, `'div'` for block content. */
export type VisuallyHiddenAs = 'span' | 'div';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /**
   * Element to render. `'span'` for inline text (the common case — a link
   * suffix, a labelling phrase). `'div'` when the hidden content is itself
   * block-level (e.g. wraps other block elements).
   * @default 'span'
   */
  as?: VisuallyHiddenAs;
}

/**
 * Content removed from the visual layout but kept in the accessibility tree.
 * @see docs/components/VisuallyHidden.md
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(function VisuallyHidden(
  { as, className, ...props },
  ref,
) {
  const Tag = as ?? 'span';
  // {...props} last (Pattern A) — nothing here is semantic to protect.
  return <Tag ref={ref as never} className={clsx(styles.root, className)} {...props} />;
});
