import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Modal.module.scss';

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Override body's padding. Default 'default' (--space-4). 'none' for edge-to-edge content. */
  padding?: 'default' | 'none';
}

/**
 * Scrollable content area between the Header and Footer. Default padding is
 * `var(--space-4)`. Pass `padding="none"` for edge-to-edge layouts (e.g. a
 * full-bleed Tabs strip).
 */
export const Body = forwardRef<HTMLDivElement, ModalBodyProps>(function Body(
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
