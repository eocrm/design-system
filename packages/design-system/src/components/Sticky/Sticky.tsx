import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Sticky.module.scss';

/**
 * Offset from the top of the scroll container at which the content pins. Maps to
 * the shared spacing scale (`xs` 4 … `xl` 24 px); `'none'` pins flush (`top: 0`).
 */
export type StickyTop = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface StickyProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Offset from the top of the scroll container at which the content pins.
   * Defaults to `'none'` (`top: 0`, flush). Use a non-zero step to clear a
   * sticky header or add breathing room.
   */
  top?: StickyTop;
  /**
   * Cap the pinned box at the viewport height and scroll its content internally,
   * so a column TALLER than the screen stays fully reachable (the overflow scrolls
   * within the box instead of below the fold). Sets `max-height` to
   * `calc(100dvh - top offset - an equal bottom gap)`, `overflow-y: auto`, and
   * `overscroll-behavior: contain` (page scroll doesn't chain from the box).
   * Default `false`. Pair with a non-`none` `top` to leave breathing room. The cap
   * is viewport-relative (`dvh`), so this assumes the page (or a viewport-tall
   * ancestor) is the scroll context — not a short fixed-height scroll container.
   */
  scroll?: boolean;
  /** The content to pin. Required — a `Sticky` with nothing inside pins nothing. */
  children: ReactNode;
}

/**
 * Sticky-positioning primitive — pins its box to the top of the scroll container
 * while the rest of the page scrolls past. The canonical use is a record/detail
 * page's narrow sidebar (owner, tags, linked records) that stays in view while
 * the wide main column scrolls.
 *
 * It sets `align-self: start` so it also works as a grid/flex item (e.g. as a
 * `<Split>` aside) — without it, a stretched item fills the row height and has
 * nowhere to stick. It positions its OWN box only; put a layout primitive
 * (`Stack`/`Cluster`) inside when you need to arrange the pinned content.
 *
 * @example
 * // Detail page: the wide main column scrolls, the 320px sidebar pins.
 * // `align="stretch"` makes the aside track full-height so Sticky has a tall
 * // containing block to pin within (Split defaults to align="start").
 * <Split
 *   side="end"
 *   asideWidth="320px"
 *   align="stretch"
 *   aside={<Sticky top="md"><Stack gap="md">{sidebarCards}</Stack></Sticky>}
 * >
 *   <Stack gap="lg">{fields}</Stack>
 * </Split>
 *
 * @example
 * // A standalone sticky filter rail next to a long list.
 * <Sticky top="lg">
 *   <FilterPanel />
 * </Sticky>
 *
 * @example
 * // A tall pinned sidebar that scrolls within itself when it exceeds the screen.
 * <Sticky top="lg" scroll>
 *   <Stack gap="md">{manyCards}</Stack>
 * </Sticky>
 *
 * @remarks When NOT to use
 * - Arranging children → `<Stack>` / `<Cluster>` / `<Grid>`. Sticky positions its
 *   own box; it doesn't arrange what's inside.
 * - A fixed overlay that floats above content regardless of scroll → that's
 *   `position: fixed` chrome (`Popover` / `Modal` / an app bar), not sticky.
 * - The master–detail split itself → `<Split>` (wrap the aside in `Sticky`).
 *
 * @remarks Anti-patterns
 * - ❌ Expecting it to pin when an ancestor has `overflow: hidden`/`auto` that
 *   isn't the intended scroll container — `position: sticky` pins to the nearest
 *   scrolling ancestor, and a clipping ancestor breaks it.
 * - ❌ Adding `margin`/`padding` to it for spacing — it carries sticky position
 *   only; spacing comes from the parent layout primitive.
 */
export const Sticky = forwardRef<HTMLDivElement, StickyProps>(function Sticky(
  { top = 'none', scroll = false, className, children, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A) — Sticky locks no attrs.
  return (
    <div
      ref={ref}
      className={clsx(styles.sticky, styles[`top-${top}`], scroll && styles.scroll, className)}
      {...rest}
    >
      {children}
    </div>
  );
});
