import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

export interface CardListRowProps extends HTMLAttributes<HTMLLIElement> {
  /** Row content — typically a `<Stack>` or `<Cluster>` of text and metadata. */
  children: ReactNode;
}

/**
 * A single row inside a `<Card.List>`, rendered as `<li>`.
 * @see docs/components/Card.md
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
