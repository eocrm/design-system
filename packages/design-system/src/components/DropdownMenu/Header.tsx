import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';

/** Props for `<DropdownMenu.Header>`. Extends all standard `div` HTML attributes. */
export interface DropdownMenuHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Identity content, e.g. an Avatar beside a name and a muted subline. The Header is `aria-hidden`, so never put focusable content here. */
  children: ReactNode;
}

/**
 * Non-interactive identity header at the top of a `DropdownMenu.Content`; hidden from assistive tech.
 * @see docs/components/DropdownMenu.md
 */
export const Header = forwardRef<HTMLDivElement, DropdownMenuHeaderProps>(function Header(
  { children, className, ...rest },
  ref,
) {
  return (
    // {...rest} first so role/aria-hidden can't be overridden
    <div
      {...rest}
      ref={ref}
      role="none"
      aria-hidden="true"
      className={clsx(styles.header, className)}
    >
      {children}
    </div>
  );
});
