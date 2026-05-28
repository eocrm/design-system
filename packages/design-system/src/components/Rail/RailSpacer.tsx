import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailSpacerProps = HTMLAttributes<HTMLDivElement>;

/**
 * `flex-grow: 1` filler that pushes anything after it to the bottom of the
 * rail. Use between the last `<Rail.Section>` and the `<Rail.Footer>` to
 * keep the footer anchored at the bottom regardless of how many sections
 * are above it.
 *
 * @example
 * <Rail>
 *   <Rail.Section>…</Rail.Section>
 *   <Rail.Section>…</Rail.Section>
 *   <Rail.Spacer />
 *   <Rail.Footer><UserChip /></Rail.Footer>
 * </Rail>
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
