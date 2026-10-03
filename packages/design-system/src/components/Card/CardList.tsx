import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

export interface CardListProps extends HTMLAttributes<HTMLUListElement> {
  /** Row items — typically `<Card.ListRow>` elements. */
  children: ReactNode;
}

/**
 * Semantic `<ul>` wrapper for a list of `<Card.ListRow>` items inside a `<Card>`.
 * @see docs/components/Card.md
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
