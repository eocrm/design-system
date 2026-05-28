import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.Start>`. Inherits the full `<div>` HTML attribute set;
 * use the standard `className` / `style` / event-handler props as usual.
 */
export type TopBarStartProps = HTMLAttributes<HTMLDivElement>;

/**
 * Left-side cluster of a `<TopBar>`. Renders a flex row that occupies the
 * remaining bar width (`flex: 1`) — so a sibling `<TopBar.End>` gets pushed
 * to the right edge with no extra spacer needed.
 *
 * Typically holds a brand mark, a workspace switcher, and/or `<TopBar.Search>`.
 * Children are laid out horizontally with the bar's standard gap.
 *
 * @example
 * <TopBar>
 *   <TopBar.Start>
 *     <TopBar.Search placeholder="Search…" hotkey="⌘K" />
 *   </TopBar.Start>
 *   <TopBar.End>
 *     <TopBar.IconButton aria-label="Notifications" indicator>
 *       <Bell size={16} />
 *     </TopBar.IconButton>
 *   </TopBar.End>
 * </TopBar>
 */
export const TopBarStart = forwardRef<HTMLDivElement, TopBarStartProps>(function TopBarStart(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx(styles.start, className)} {...props} />;
});
