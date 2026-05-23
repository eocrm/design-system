import { forwardRef, useEffect, useId, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useModalContext } from './context';
import { sanitizeId } from '../_internal/refs';
import styles from './Modal.module.scss';

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the built-in × close button on the right edge. Default true. */
  closeButton?: boolean;
}

/**
 * Title bar at the top of the modal. Auto-registers its heading id with
 * the modal's context so `<Content>` can wire `aria-labelledby`. Renders
 * a built-in × close button at the right edge unless `closeButton={false}`
 * (used for forced-step modals).
 */
export const Header = forwardRef<HTMLDivElement, ModalHeaderProps>(function Header(
  { closeButton = true, className, children, ...rest },
  ref,
) {
  const ctx = useModalContext('Header');
  const rawId = useId();
  const headingId = `modal-heading-${sanitizeId(rawId)}`;

  useEffect(() => {
    ctx.setHeadingId(headingId);
    return () => ctx.setHeadingId(null);
  }, [ctx, headingId]);

  return (
    <div ref={ref} className={clsx(styles.header, className)} {...rest}>
      <h2 id={headingId} className={styles.headerTitle}>
        {children}
      </h2>
      {closeButton && (
        <button
          type="button"
          aria-label="Close dialog"
          className={styles.headerCloseButton}
          onClick={() => ctx.setOpen(false)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
