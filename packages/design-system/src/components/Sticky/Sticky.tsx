import { forwardRef, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
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
  /**
   * Raise the pinned box above positioned/stacked page content (e.g. DashboardCanvas
   * cells) so a page-level sticky bar is not painted over or click-blocked by them.
   * Sets `z-index` just below the TopBar. Default `false`. Caveat: `z-index` on a
   * sticky box creates a stacking context, so don't use it on a Split aside that
   * hosts inline (non-portaled) popovers, which would be trapped inside it.
   */
  layer?: boolean;
  /**
   * Paint the box with the page background always; while pinned, also a bottom
   * divider and a strip over the gap above it (the `top` offset), so content
   * scrolling underneath doesn't show through. Pinned state is tracked with an
   * IntersectionObserver (`data-pinned`). For page-level bars. Default `false`.
   */
  surface?: boolean;
  /** The content to pin. Required — a `Sticky` with nothing inside pins nothing. */
  children: ReactNode;
}

/**
 * Sticky-positioning primitive that pins its box to the top of the scroll container.
 * @see docs/components/Sticky.md
 */
export const Sticky = forwardRef<HTMLDivElement, StickyProps>(function Sticky(
  { top = 'none', scroll = false, layer = false, surface = false, className, children, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  // Pinned detection without a sentinel (Sticky must stay a single element): shrink
  // the observer root by the top offset so a pinned box is partly outside it.
  useEffect(() => {
    const el = innerRef.current;
    if (!surface || !el || typeof IntersectionObserver === 'undefined') return;
    const topPx = parseFloat(getComputedStyle(el).top) || 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        const pinned = entry.intersectionRatio < 1 && entry.boundingClientRect.top <= topPx + 1;
        if (pinned) el.setAttribute('data-pinned', '');
        else el.removeAttribute('data-pinned');
      },
      { threshold: [1], rootMargin: `-${topPx + 1}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-pinned');
    };
  }, [surface, top]);

  // {...rest} last so consumer overrides win (Pattern A) — Sticky locks no attrs.
  // `data-sticky` is an internal cross-component contract: Split.module.scss
  // targets it to unstick a collapsed aside (#558). Rename both together.
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(ref, innerRef)}
      data-sticky=""
      className={clsx(
        styles.sticky,
        styles[`top-${top}`],
        scroll && styles.scroll,
        layer && styles.layer,
        surface && styles.surface,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
