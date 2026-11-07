import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';

/** Props for `<DropdownMenu.Header>`. Extends all standard `div` HTML attributes. */
export interface DropdownMenuHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Identity content, e.g. an Avatar with a name and a muted subline. */
  children: ReactNode;
}

/**
 * Non-interactive identity header at the top of a `DropdownMenu.Content`.
 * @see docs/components/DropdownMenu.md
 */
export const Header = forwardRef<HTMLDivElement, DropdownMenuHeaderProps>(function Header(
  { children, className, ...rest },
  ref,
) {
  return (
    <div {...rest} ref={ref} role="none" className={clsx(styles.header, className)}>
      {children}
    </div>
  );
});
