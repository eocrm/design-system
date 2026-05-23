import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Drawer.module.scss';

export interface DrawerBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Override body padding. Default 'default' (--space-4). 'none' for edge-to-edge. */
  padding?: 'default' | 'none';
}

export const Body = forwardRef<HTMLDivElement, DrawerBodyProps>(function Body(
  { padding = 'default', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.body, padding === 'none' && styles.bodyPaddingNone, className)}
      {...rest}
    >
      {children}
    </div>
  );
});
