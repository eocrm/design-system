import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Top slot of the rail (logo or brand mark) with a padded brand area and header-to-nav divider (`Rail.Header`).
 * @see docs/components/Rail.md
 */
export const RailHeader = forwardRef<HTMLDivElement, RailHeaderProps>(function RailHeader(
  { className, children, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A). Children sit in an
  // inner block box so the header can centre them vertically without turning
  // each child (or a bare text node) into its own flex item.
  return (
    <div ref={ref} className={clsx(styles.header, className)} {...props}>
      <div className={styles.headerInner}>{children}</div>
    </div>
  );
});
