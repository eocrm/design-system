import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailSpacerProps = HTMLAttributes<HTMLDivElement>;

/**
 * `flex-grow: 1` filler that pushes trailing sections to the bottom of the rail body (`Rail.Spacer`).
 * @see docs/components/Rail.md
 */
export const RailSpacer = forwardRef<HTMLDivElement, RailSpacerProps>(function RailSpacer(
  { className, 'aria-hidden': ariaHidden = true, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div ref={ref} aria-hidden={ariaHidden} className={clsx(styles.spacer, className)} {...props} />
  );
});
