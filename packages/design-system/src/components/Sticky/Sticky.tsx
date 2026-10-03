import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Sticky.module.scss';

/**
 * Offset from the top of the scroll container at which the content pins. Maps to
 * the shared spacing scale (`xs` 4 … `xl` 24 px); `'none'` pins flush (`top: 0`),
 * and `'topbar'` clears the standard TopBar plus the normal content gap.
 */
export type StickyTop = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'topbar';

export interface StickyProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Offset from the top of the scroll container at which the content pins.
   * Defaults to `'none'` (`top: 0`, flush). Use `'topbar'` inside an AppLayout
   * with pinned TopBar; spacing steps add breathing room without chrome clearance.
   */
  top?: StickyTop;
  /**
   * Cap the pinned box at the viewport height and scroll its content internally,
   * so a column TALLER than the screen stays fully reachable (the overflow scrolls
   * within the box instead of below the fold). Sets `max-height` to
   * `calc(100dvh - top offset - bottom gap)`, `overflow-y: auto`, and
   * `overscroll-behavior: contain` (page scroll doesn't chain from the box). The
   * bottom gap defaults to the selected rhythm offset; `top="topbar"` instead
   * defaults it to the standard content gap so chrome height is not subtracted
   * twice. Set `--sticky-bottom-gap` on this element to override either default.
   * Default `false`. Pair with a non-`none` `top` to leave breathing room. The cap is
   * viewport-relative (`dvh`), so this assumes the page (or a viewport-tall
   * ancestor) is the scroll context — not a short fixed-height scroll container.
   */
  scroll?: boolean;
  /** The content to pin. Required — a `Sticky` with nothing inside pins nothing. */
  children: ReactNode;
}

/**
 * Sticky-positioning primitive that pins its box to the top of the scroll container.
 * @see docs/components/Sticky.md
 */
export const Sticky = forwardRef<HTMLDivElement, StickyProps>(function Sticky(
  { top = 'none', scroll = false, className, children, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A) — Sticky locks no attrs.
  // `data-sticky` is an internal cross-component contract: Split.module.scss
  // targets it to unstick a collapsed aside (#558). Rename both together.
  return (
    <div
      ref={ref}
      data-sticky=""
      className={clsx(styles.sticky, styles[`top-${top}`], scroll && styles.scroll, className)}
      {...rest}
    >
      {children}
    </div>
  );
});
