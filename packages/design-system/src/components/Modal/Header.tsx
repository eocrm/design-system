import { forwardRef, useEffect, useId, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n/useTranslation';
import { useModalContext } from './context';
import { sanitizeId } from '../_internal/refs';
import styles from './Modal.module.scss';

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the built-in × close button on the right edge. Default true. */
  closeButton?: boolean;
}

/**
 * Title bar at the top of the modal: names the dialog and shows a close button unless `closeButton={false}`.
 * @see docs/components/Modal.md
 */
export const Header = forwardRef<HTMLDivElement, ModalHeaderProps>(function Header(
  { closeButton = true, className, children, ...rest },
  ref,
) {
  const t = useTranslation();
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
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t('modal.close')}
          onClick={() => ctx.setOpen(false)}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
