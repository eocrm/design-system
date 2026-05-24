import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

export interface CardListProps extends HTMLAttributes<HTMLUListElement> {
  /** Row items — typically `<Card.ListRow>` elements. */
  children: ReactNode;
}

/**
 * Semantic `<ul>` wrapper for a list of `<Card.ListRow>` items inside a
 * `<Card>`. Applies list-reset styling (no bullets, no indent) so rows bleed
 * edge-to-edge. Screen readers announce "list with N items".
 *
 * @example
 * <Card padding="none">
 *   <Card.Header>Recent activity</Card.Header>
 *   <Card.List>
 *     <Card.ListRow>Row content</Card.ListRow>
 *   </Card.List>
 * </Card>
 *
 * @remarks
 * Row dividers use a `:last-child` CSS selector to suppress the bottom border
 * on the final row. Fragments are transparent (work fine — `<Fragment>` doesn't
 * render a DOM node), but wrapping rows in an extra `<div>` or other element
 * breaks the last-child match and leaves a stray divider on the visual last
 * row. Render rows as direct children (or via `.map`) for the divider to
 * resolve correctly.
 */
export const CardList = forwardRef<HTMLUListElement, CardListProps>(function CardList(
  { children, className, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <ul ref={ref} className={clsx(styles.list, className)} {...rest}>
      {children}
    </ul>
  );
});
