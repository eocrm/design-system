import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

/** Props for the content region inside a compound Card. */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Makes the body the flexible vertical scroll region of a `fill` Card while
   * sibling `Card.Header` content stays fixed. The Card's parent must provide
   * a definite height. Defaults to `false`.
   * @default false
   */
  scroll?: boolean;
}

/**
 * Padded content region for the Card compound API. Use `scroll` with
 * `<Card fill>` when content must scroll beneath a fixed `Card.Header` inside
 * a bounded Grid, Sortable, or DashboardCanvas cell.
 *
 * @example
 * // A consistently padded, non-scrolling section:
 * <Card>
 *   <Card.Header>Account details</Card.Header>
 *   <Card.Body>
 *     <Stack gap="sm">...</Stack>
 *   </Card.Body>
 * </Card>
 *
 * @example
 * // A fixed header over a scrolling body in a bounded dashboard cell:
 * <Card fill>
 *   <Card.Header>Pipeline</Card.Header>
 *   <Card.Body scroll>
 *     <Stack gap="sm">...</Stack>
 *   </Card.Body>
 * </Card>
 *
 * @remarks When NOT to use
 * - Outside a Card. CardBody owns padding and sizing only as part of Card's
 *   compound structure.
 * - For page-level scrolling. Let the page or AppLayout own that scroll area.
 *
 * @remarks Keyboard
 * `scroll` sets `tabIndex={0}` so the region is reachable without a mouse.
 * Give it a name too when its content is meaningful — `role="group"` plus
 * `aria-label` — since the component cannot know what it holds.
 *
 * @remarks Anti-patterns
 * - ❌ Adding consumer CSS for `flex: 1`, `min-height: 0`, or
 *   `overflow-y: auto`. Use `<Card fill>` with `<Card.Body scroll>`.
 * - ❌ Expecting `scroll` to create a height. The Card's parent must provide a
 *   definite height; `fill` then carries that bound into the body region.
 * - ❌ Wrapping CardBody before placing it in Card. Keep it a direct child
 *   (Fragments are transparent) so Card can detect the compound structure.
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { scroll = false, className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A) — including
  // tabIndex, so a consumer that gives the region a focusable descendant, or
  // wants to manage focus itself, can opt out with tabIndex={-1}.
  return (
    <div
      ref={ref}
      // `scroll` is what makes this an overflow container, so `scroll` is what
      // has to make it keyboard-reachable. Without it, content that overflows
      // is unreachable for a keyboard-only user whenever it has no focusable
      // descendant — axe `scrollable-region-focusable`, WCAG 2.1.1. The
      // sharpest case is a loading body full of `Skeleton`s, every one of
      // which is aria-hidden: a scrollable region with nothing in it to reach.
      //
      // The NAME still has to come from the consumer — the DS cannot know what
      // the region holds — so pair this with `role="group"` and an
      // `aria-label` when the content warrants announcing.
      tabIndex={scroll ? 0 : undefined}
      className={clsx(styles.body, scroll && styles.scroll, className)}
      {...props}
    />
  );
});
