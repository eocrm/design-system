import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.Start>`. Inherits the full `<div>` HTML attribute set;
 * use the standard `className` / `style` / event-handler props as usual.
 */
export type TopBarStartProps = HTMLAttributes<HTMLDivElement>;

/**
 * Left-side cluster of a `<TopBar>` that takes the remaining bar width.
 * @see docs/components/TopBar.md
 */
export const TopBarStart = forwardRef<HTMLDivElement, TopBarStartProps>(function TopBarStart(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx(styles.start, className)} {...props} />;
});
