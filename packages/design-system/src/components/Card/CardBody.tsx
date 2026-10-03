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
 * Padded content region for the Card compound API.
 * @see docs/components/Card.md
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
