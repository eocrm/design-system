import { useEffect, useLayoutEffect, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { useModalContext } from './context';
import { useFocusTrap } from '../_internal/overlay/useFocusTrap';
import { overlayStack as modalStack } from '../_internal/overlay';
import styles from './Modal.module.scss';

export interface ContentProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Dialog container. `role="dialog"`, `aria-modal="true"`, tabIndex=-1 so
 * the focus trap can take over. Owns:
 * - Initial focus on open (either initialFocusRef or the container itself).
 * - Focus trap (active only when this modal is top of the stack).
 * - Escape capture-phase listener (also gated by isTop).
 * - Renders the compound children (Header/Body/Footer/Close) inside the dialog.
 */
export function Content({ children, className, style }: ContentProps) {
  const ctx = useModalContext('Content');

  // Initial focus on open. Try the ref first; if it points to a non-focusable
  // node, the browser .focus() no-ops and the focusin recapture in
  // useFocusTrap will bring focus back to the container.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    if (!ctx.isTop) return; // lower modals are display:none — focusing them would scroll
    queueMicrotask(() => {
      const target = ctx.initialFocusRef?.current ?? ctx.contentRef.current;
      target?.focus({ preventScroll: true });
    });
  }, [ctx.open, ctx.isTop, ctx.initialFocusRef, ctx.contentRef]);

  // Escape closes the topmost modal only. Capture-phase to beat focused
  // widgets that stopPropagation on Esc (matches Popover).
  useEffect(() => {
    if (!ctx.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!modalStack.isTop(ctx.modalId)) return;
      // #274: an open floating surface (Select/Popover/menu/date-time popover/
      // Rail flyout) wins this press — its own capture listener, which runs
      // later in the same keydown, closes it. The next press reaches us.
      if (modalStack.hasOpenFloating() || modalStack.wasEscapeConsumed(e)) return;
      if (ctx.disableEscapeClose) return;
      e.preventDefault();
      ctx.setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx.open, ctx.modalId, ctx.disableEscapeClose, ctx.setOpen]);

  // Focus trap — active only when this modal is on top of the stack.
  useFocusTrap(ctx.contentRef, ctx.open && ctx.isTop);

  return (
    <div
      ref={ctx.contentRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ctx.headingId ?? undefined}
      aria-label={!ctx.headingId ? ctx.ariaLabel : undefined}
      aria-describedby={ctx.ariaDescribedBy}
      tabIndex={-1}
      data-state={ctx.open ? 'open' : 'closed'}
      data-size={ctx.size}
      className={clsx(styles.content, styles[`size-${ctx.size}`], className)}
      style={style}
    >
      {children}
    </div>
  );
}
