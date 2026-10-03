import { forwardRef, useEffect, useId, useRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n/useTranslation';
import { useDrawerContext } from './context';
import { sanitizeId, mergeRefs } from '../_internal/refs';
import { useDragToClose } from './useDragToClose';
import styles from './Drawer.module.scss';

export interface DrawerHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the built-in × close button. Default true. */
  closeButton?: boolean;
}

/**
 * Title bar at the top of the drawer: names the dialog, shows a close button and is the drag-to-close origin.
 * @see docs/components/Drawer.md
 */
export const Header = forwardRef<HTMLDivElement, DrawerHeaderProps>(function Header(
  { closeButton = true, className, children, ...rest },
  ref,
) {
  const t = useTranslation();
  const ctx = useDrawerContext('Header');
  const rawId = useId();
  const headingId = `drawer-heading-${sanitizeId(rawId)}`;
  const internalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ctx.setHeadingId(headingId);
    return () => ctx.setHeadingId(null);
  }, [ctx, headingId]);

  useDragToClose(internalRef, {
    side: ctx.side,
    active: ctx.dragToClose && ctx.isTop && ctx.open,
    onDismiss: () => ctx.setOpen(false),
    contentRef: ctx.contentRef,
  });

  return (
    <div
      ref={mergeRefs<HTMLDivElement>(internalRef, ref)}
      className={clsx(styles.header, className)}
      {...rest}
    >
      <h2 id={headingId} className={styles.headerTitle}>
        {children}
      </h2>
      {closeButton && (
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t('drawer.close')}
          onClick={() => ctx.setOpen(false)}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
