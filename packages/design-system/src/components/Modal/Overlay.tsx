import {
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalContext } from './context';
import styles from './Modal.module.scss';

export interface OverlayProps {
  children: ReactNode;
}

/**
 * Portaled dimming/blurred backdrop rendered behind the dialog. Owns the
 * inert-background attribute on body children + the overlay-click
 * dismissal (only fires when the click target is the overlay itself,
 * not bubbled from content).
 *
 * Carries two data-attributes consumed by SCSS:
 * - `data-variant`        : 'solid' | 'blur' — visual variant
 * - `data-stack-position` : 'top' | 'hidden' — whether this overlay is the
 *                           topmost open modal (visible) or a lower one
 *                           (display: none; React state preserved).
 */
export function Overlay({ children }: OverlayProps) {
  const ctx = useModalContext('Overlay');

  // Inert background — applied to all body children EXCEPT any modal portal
  // root. Skipping ALL modal portals (not just the first) is critical for
  // stacked modals: the inner modal's portal is also a body child, and it
  // must remain interactive even though it was added after the outer's.
  useEffect(() => {
    if (!ctx.isTop) return;
    const bodyChildren = Array.from(document.body.children) as HTMLElement[];
    const toRestore: Array<{ el: HTMLElement; had: boolean }> = [];
    for (const el of bodyChildren) {
      if (el.hasAttribute('data-modal-portal-root')) continue;
      const had = el.hasAttribute('inert');
      if (!had) el.setAttribute('inert', '');
      toRestore.push({ el, had });
    }
    return () => {
      for (const { el, had } of toRestore) {
        if (!had) el.removeAttribute('inert');
      }
    };
  }, [ctx.isTop]);

  const onClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Only dismiss when the click is on the backdrop itself.
    if (e.target !== e.currentTarget) return;
    if (!ctx.dismissOnOverlayClick) return;
    if (!ctx.isTop) return; // safety: lower overlays are display:none, but guard anyway
    ctx.setOpen(false);
  };

  // Custom prop carries depth to SCSS so any future per-depth styling can
  // read it; for the current display-toggle stacking, only the topmost
  // overlay is visible, so this collapses to a no-op for most callers.
  const style = { ['--modal-depth' as string]: String(ctx.depth) } as CSSProperties;

  return createPortal(
    <div
      data-modal-portal-root=""
      data-state={ctx.open ? 'open' : 'closed'}
      data-variant={ctx.overlay}
      data-stack-position={ctx.isTop ? 'top' : 'hidden'}
      className={styles.overlay}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>,
    document.body,
  );
}
