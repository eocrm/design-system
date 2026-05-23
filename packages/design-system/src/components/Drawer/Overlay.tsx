import {
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useDrawerContext } from './context';
import styles from './Drawer.module.scss';

export interface OverlayProps {
  children: ReactNode;
}

const PORTAL_EXEMPT_SELECTOR = '[data-modal-portal-root], [data-drawer-portal-root]';

/**
 * Portaled dimming / blurred backdrop. Owns the inert-background attribute
 * on body children (exempting modal AND drawer portals) + overlay-click
 * dismissal. Three data-attributes consumed by SCSS:
 * - data-variant         : 'solid' | 'blur'
 * - data-stack-position  : 'top' | 'underneath' | 'hidden'
 * - data-overlay-paint   : 'yes' | 'no'
 */
export function Overlay({ children }: OverlayProps) {
  const ctx = useDrawerContext('Overlay');

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
    if (e.target !== e.currentTarget) return;
    if (!ctx.dismissOnOverlayClick) return;
    if (!ctx.isTop) return;
    ctx.setOpen(false);
  };

  let stackPosition: 'top' | 'hidden' | 'underneath';
  if (ctx.isTop) {
    stackPosition = 'top';
  } else if (ctx.topMode === 'replace') {
    stackPosition = 'hidden';
  } else {
    stackPosition = 'underneath';
  }

  const paint =
    (ctx.topMode === 'replace' && ctx.isTop) || (ctx.topMode === 'overlay' && ctx.depth === 0);

  const style = { ['--modal-depth' as string]: String(ctx.depth) } as CSSProperties;

  return createPortal(
    <div
      data-drawer-portal-root=""
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
