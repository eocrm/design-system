import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.End>`. Inherits the full `<div>` HTML attribute set;
 * use the standard `className` / `style` / event-handler props as usual.
 */
export type TopBarEndProps = HTMLAttributes<HTMLDivElement>;

/**
 * Right-side cluster of a `<TopBar>` that shrinks to its content.
 * @see docs/components/TopBar.md
 */
export const TopBarEnd = forwardRef<HTMLDivElement, TopBarEndProps>(function TopBarEnd(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx(styles.end, className)} {...props} />;
});
