import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Top slot of the rail (logo or brand mark) with a padded brand area and header-to-nav divider (`Rail.Header`).
 * @see docs/components/Rail.md
 */
export const RailHeader = forwardRef<HTMLDivElement, RailHeaderProps>(function RailHeader(
  { className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return <div ref={ref} className={clsx(styles.header, className)} {...props} />;
});
