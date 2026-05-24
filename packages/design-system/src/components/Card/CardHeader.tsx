import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

/** Heading level wrapping the title. Defaults to 'h3'. Same vocab as Accordion. */
export type CardHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Heading level for the title text. Defaults to `'h3'` (assumes the page
   * has an h1/h2 above). Override when this section sits beneath an h1
   * directly (`headerLevel="h2"`) or further nested (`headerLevel="h4"`).
   */
  headerLevel?: CardHeaderLevel;
  /**
   * Optional right-aligned slot — typically a `<Link>` or `<Button>` that
   * lets the user navigate to a full list or take a section-level action.
   * Rendered inside a `<span>` that is flex-shrink: 0 so it never wraps.
   */
  action?: ReactNode;
  /**
   * Title content. Becomes the inner text of the heading element. Typically
   * a plain string, but can contain inline elements if needed.
   */
  children: ReactNode;
}

/**
 * Title row subcomponent for `<Card>` with an optional right-aligned action
 * slot and a bottom-border separator. Renders as a `<div>` containing a
 * configurable heading element (`h3` by default) plus an optional `<span>`
 * wrapping the `action` node.
 *
 * Use inside `<Card padding="none">` so the header's internal padding aligns
 * flush with the card edge.
 *
 * @example
 * // Basic header — title only:
 * <Card padding="none">
 *   <Card.Header>Recent activity</Card.Header>
 *   <Card.List>...</Card.List>
 * </Card>
 *
 * @example
 * // Header with a right-aligned "View all" link:
 * <Card padding="none">
 *   <Card.Header action={<Link variant="muted">View all</Link>}>
 *     Deals needing attention
 *   </Card.Header>
 *   <Card.List>...</Card.List>
 * </Card>
 *
 * @example
 * // Adjust heading level when nested below an h1 (page has no h2 above):
 * <Card padding="none">
 *   <Card.Header headerLevel="h2">Pipeline overview</Card.Header>
 *   <Card.List>...</Card.List>
 * </Card>
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { headerLevel = 'h3', action, children, className, ...rest },
  ref,
) {
  // headerLevel is a string union of valid HTML heading tag names; cast to
  // the union (not a single literal) so the JSX dispatch type is honest.
  const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div ref={ref} className={clsx(styles.header, className)} {...rest}>
      <Heading className={styles.title}>{children}</Heading>
      {action != null && <span className={styles.action}>{action}</span>}
    </div>
  );
});
