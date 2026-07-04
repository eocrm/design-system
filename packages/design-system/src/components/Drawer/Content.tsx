import { useEffect, useLayoutEffect, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { useFocusTrap, overlayStack } from '../_internal/overlay';
import { useDrawerContext } from './context';
import styles from './Drawer.module.scss';

export interface ContentProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Dialog container. role="dialog", aria-modal="true", tabIndex=-1.
 * Owns initial focus, focus trap (when isTop), Escape capture-phase listener,
 * and renders compound children (Header/Body/Footer/Close).
 */
export function Content({ children, className, style }: ContentProps) {
  const ctx = useDrawerContext('Content');

  useLayoutEffect(() => {
    if (!ctx.open || !ctx.isTop) return;
    queueMicrotask(() => {
      const target = ctx.initialFocusRef?.current ?? ctx.contentRef.current;
      target?.focus({ preventScroll: true });
    });
  }, [ctx.open, ctx.isTop, ctx.initialFocusRef, ctx.contentRef]);

  useEffect(() => {
    if (!ctx.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!overlayStack.isTop(ctx.drawerId)) return;
      // #274: an open floating surface (Select/Popover/menu/date-time popover/
      // Rail flyout) wins this press — its own Escape handling (a capture
      // listener or an element-scoped handler) closes it on this same press;
      // wasEscapeConsumed covers a surface whose listener already ran. The
      // next press reaches us.
      if (overlayStack.hasOpenFloating() || overlayStack.wasEscapeConsumed(e)) return;
      if (ctx.disableEscapeClose) return;
      e.preventDefault();
      ctx.setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx.open, ctx.drawerId, ctx.disableEscapeClose, ctx.setOpen]);

  useFocusTrap(ctx.contentRef, ctx.open && ctx.isTop);

  return (
    <div
      ref={ctx.contentRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ctx.headingId ?? undefined}
      aria-label={ctx.headingId ? undefined : ctx.ariaLabel}
      aria-describedby={ctx.ariaDescribedBy}
      tabIndex={-1}
      data-state={ctx.open ? 'open' : 'closed'}
      data-side={ctx.side}
      data-size={ctx.size}
      className={clsx(
        styles.content,
        styles[`side-${ctx.side}`],
        styles[`size-${ctx.size}`],
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
