import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Modal.module.scss';

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal action alignment. Default 'end'. */
  align?: 'start' | 'end' | 'space-between';
}

/**
 * Pinned action bar at the bottom of the modal, announced as a `role="group"`.
 * @see docs/components/Modal.md
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
