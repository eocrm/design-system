import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.End>`. Inherits the full `<div>` HTML attribute set;
 * use the standard `className` / `style` / event-handler props as usual.
 */
export type TopBarEndProps = HTMLAttributes<HTMLDivElement>;

/**
 * Right-side cluster of a `<TopBar>`. Renders a flex row that shrinks to its
 * intrinsic content width — paired with `<TopBar.Start>` (which flex-grows),
 * `End` is naturally pushed to the right edge of the bar.
 *
 * Typically holds `<TopBar.IconButton>` action buttons and a trailing
 * `<Avatar>` for the user menu.
 *
 * @example
 * <TopBar.End>
 *   <TopBar.IconButton aria-label="Create new"><Plus size={16} /></TopBar.IconButton>
 *   <TopBar.IconButton aria-label="Notifications" indicator><Bell size={16} /></TopBar.IconButton>
 *   <Avatar name="Alex Rivera" size="sm" />
 * </TopBar.End>
 */
export const TopBarEnd = forwardRef<HTMLDivElement, TopBarEndProps>(function TopBarEnd(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx(styles.end, className)} {...props} />;
});
