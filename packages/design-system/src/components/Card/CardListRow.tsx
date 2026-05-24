import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

export interface CardListRowProps extends HTMLAttributes<HTMLLIElement> {
  /** Row content — typically a `<Stack>` or `<Cluster>` of text and metadata. */
  children: ReactNode;
}

/**
 * A single row inside a `<Card.List>`. Renders as `<li>` with padded content
 * and a bottom dividing border. The border is suppressed on the last child via
 * `:last-child` in SCSS so the final row sits flush against the card edge.
 *
 * @example
 * <Card.List>
 *   <Card.ListRow>
 *     <Stack gap="xs">
 *       <span>Deal name</span>
 *       <span>Company · $12,000</span>
 *     </Stack>
 *   </Card.ListRow>
 * </Card.List>
 */
export const CardListRow = forwardRef<HTMLLIElement, CardListRowProps>(function CardListRow(
  { children, className, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <li ref={ref} className={clsx(styles.listRow, className)} {...rest}>
      {children}
    </li>
  );
});
