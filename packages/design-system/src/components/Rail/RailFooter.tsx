import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bottom slot of the rail — typically a user chip, theme switcher, or the
 * `<Rail.CollapseToggle>` itself. It anchors to the bottom on its own: the
 * rail extracts the first `<Rail.Footer>` out of the scroll box and renders it
 * as a separate flex child below, so it stays put however long the item list
 * grows. No `<Rail.Spacer />` needed.
 *
 * @example
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
