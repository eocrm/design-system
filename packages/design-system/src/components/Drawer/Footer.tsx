import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Drawer.module.scss';

export interface DrawerFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal action alignment. Default 'end'. */
  align?: 'start' | 'end' | 'space-between';
}

export const Footer = forwardRef<HTMLDivElement, DrawerFooterProps>(function Footer(
  { align = 'end', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      role="group"
      className={clsx(styles.footer, styles[`footerAlign-${align}`], className)}
      {...rest}
    >
      {children}
    </div>
  );
});
