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
 * Renders content that is removed from the visual layout but stays in the
 * accessibility tree — the standard "clip" technique (`position: absolute`,
 * 1x1px, clipped, no `display: none` / `visibility: hidden`, which would also
 * remove it from assistive tech). Use for text that only screen reader users
 * need: a link's destination context, a landmark's hidden heading, or as the
 * building block `LiveRegion` renders its announcement text into.
 *
 * @example
 * // Icon-only link suffix
 * <a href={href}>
 *   {label}
 *   <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
 * </a>
 *
 * @example
 * // Hidden heading for a landmark
 * <nav aria-labelledby="site-nav-heading">
 *   <VisuallyHidden as="div">
 *     <Title id="site-nav-heading" order={2}>Site navigation</Title>
 *   </VisuallyHidden>
 *   {...}
 * </nav>
 *
 * @example
 * // Used inside LiveRegion (LiveRegion renders one internally — shown for context)
 * <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
 *   {message}
 * </VisuallyHidden>
 *
 * @remarks
 * **Anti-patterns:**
 * - ❌ To hide something from everyone — use the `hidden` attribute or a
 *   conditional render, not VisuallyHidden. It stays reachable by assistive
 *   tech; it isn't a display toggle.
 * - ❌ On a focusable element (a skip link) — the content stays invisible
 *   even when focused. There is no show-on-focus variant yet.
 * - ❌ To label a control — prefer `aria-label` or a visible `<label>`. Use
 *   VisuallyHidden only when real hidden text needs to sit in the DOM flow
 *   (e.g. before other inline content it must precede).
 * - ❌ For announcements — a plain hidden span is not live. Use `LiveRegion`,
 *   which sets `role`/`aria-live` and manages the clear-then-write timing.
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(function VisuallyHidden(
  { as, className, ...props },
  ref,
) {
  const Tag = as ?? 'span';
  // {...props} last (Pattern A) — nothing here is semantic to protect.
  return <Tag ref={ref as never} className={clsx(styles.root, className)} {...props} />;
});
