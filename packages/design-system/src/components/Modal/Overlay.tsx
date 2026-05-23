import {
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useModalContext } from './context';
import styles from './Modal.module.scss';

const PORTAL_EXEMPT_SELECTOR = '[data-modal-portal-root], [data-drawer-portal-root]';

export interface OverlayProps {
  children: ReactNode;
}

/**
 * Portaled dimming/blurred backdrop rendered behind the dialog. Owns the
 * inert-background attribute on body children + the overlay-click
 * dismissal (only fires when the click target is the overlay itself,
 * not bubbled from content).
 *
 * Carries three data-attributes consumed by SCSS:
 * - `data-variant`        : 'solid' | 'blur' — visual variant
 * - `data-stack-position` : 'top' | 'underneath' | 'hidden'
 *     - 'top'       — this is the topmost open modal
 *     - 'underneath' — lower modal in overlay-stack mode (stays visible)
 *     - 'hidden'    — lower modal in replace-stack mode (display: none)
 * - `data-overlay-paint`  : 'yes' | 'no'
 *     - 'yes' — this overlay paints its dim/blur background
 *     - 'no'  — transparent (upper modal in overlay-stack mode)
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
      if (el.matches(PORTAL_EXEMPT_SELECTOR)) continue;
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

  // Visibility classification
  let stackPosition: 'top' | 'hidden' | 'underneath';
  if (ctx.isTop) {
    stackPosition = 'top';
  } else if (ctx.topMode === 'replace') {
    stackPosition = 'hidden';
  } else {
    // topMode === 'overlay' && !isTop
    stackPosition = 'underneath';
  }

  // Paint classification: only paint dim/blur if this is the visible "ground
  // level". In replace mode the top modal paints; in overlay mode only the
  // bottom of the stack (depth 0) paints so upper overlays are transparent.
  const paint =
    (ctx.topMode === 'replace' && ctx.isTop) || (ctx.topMode === 'overlay' && ctx.depth === 0);

  // Custom prop carries depth to SCSS for any per-depth styling.
  const style = { ['--modal-depth' as string]: String(ctx.depth) } as CSSProperties;

  return createPortal(
    <div
      data-modal-portal-root=""
      data-state={ctx.open ? 'open' : 'closed'}
      data-variant={ctx.overlay}
      data-stack-position={stackPosition}
      data-overlay-paint={paint ? 'yes' : 'no'}
      className={styles.overlay}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>,
    document.body,
  );
}
