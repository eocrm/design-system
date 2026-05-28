import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bottom slot of the rail — typically a user chip, theme switcher, or the
 * `<Rail.CollapseToggle>` itself. To anchor the footer to the bottom of the
 * rail, render a `<Rail.Spacer />` before it; without the spacer the footer
 * sits at its natural flow position right after the preceding section.
 *
 * @example
 * <Rail.Spacer />
 * <Rail.Footer>
 *   <Rail.CollapseToggle />
 *   <UserChip />
 * </Rail.Footer>
 */
export const RailFooter = forwardRef<HTMLDivElement, RailFooterProps>(function RailFooter(
  { className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return <div ref={ref} className={clsx(styles.footer, className)} {...props} />;
});
