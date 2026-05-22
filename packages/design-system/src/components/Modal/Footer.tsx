import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Modal.module.scss';

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal action alignment. Default 'end'. */
  align?: 'start' | 'end' | 'space-between';
}

/**
 * Pinned action bar at the bottom of the modal. `role="group"` so screen
 * readers announce the action set as a unit. `align='end'` (default)
 * right-aligns the actions; `'space-between'` splits primary actions to
 * opposite ends (e.g. a danger action on the left, save/cancel on the right).
 */
export const Footer = forwardRef<HTMLDivElement, ModalFooterProps>(function Footer(
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
