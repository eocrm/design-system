import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bottom slot of the rail, pinned outside the scroll box on its own (`Rail.Footer`).
 * @see docs/components/Rail.md
 */
export const RailFooter = forwardRef<HTMLDivElement, RailFooterProps>(function RailFooter(
  { className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return <div ref={ref} className={clsx(styles.footer, className)} {...props} />;
});
