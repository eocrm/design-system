import { forwardRef, useEffect, useLayoutEffect, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { usePopoverContext } from './context';
import { mergeRefs } from '../_internal/refs';
import styles from './Popover.module.scss';

/** Which side of the trigger the popover prefers. Floating UI auto-flips on collision. */
export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
/** Which edge of the popover aligns to the corresponding trigger edge. */
export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Default `'bottom'`. Auto-flips on collision via Floating UI. */
  side?: PopoverSide;
  /** Edge alignment. Default `'center'`. */
  align?: PopoverAlign;
  /** Gap in px between trigger and panel. Default `10` (room for the arrow). */
  sideOffset?: number;
  /** Minimum width in px or any CSS length. Defaults to `--size-popover-min-width` (220). */
  minWidth?: number | string;
}

export const Content = forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  {
    side: _side = 'bottom',
    align: _align = 'center',
    sideOffset: _sideOffset = 10,
    minWidth: _minWidth,
    className,
    children,
    ...rest
  },
  forwardedRef,
) {
  const ctx = usePopoverContext('Content');

  // Focus the panel on open. preventScroll: same reason DropdownMenu uses
  // it — the portal renders at document origin before Floating UI positions
  // it, focusing without preventScroll would yank the page.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    queueMicrotask(() => ctx.contentRef.current?.focus({ preventScroll: true }));
  }, [ctx.open, ctx.contentRef]);

  // Document Escape listener while open. Capture phase so it runs before
  // focused widgets that may stopPropagation.
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        ctx.closeAll();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx.open, ctx.closeAll]);

  // Outside-click: close if pointerdown lands outside the panel AND outside
  // the trigger. Capture phase fires before focused widgets that may
  // stopPropagation. The check uses contains() so clicks on descendants of
  // the panel (e.g. a button inside) don't dismiss.
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = ctx.contentRef.current;
      const trigger = ctx.triggerRef.current;
      if (panel && panel.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      ctx.setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ctx.open, ctx.contentRef, ctx.triggerRef, ctx.setOpen]);

  if (!ctx.open) return null;

  return createPortal(
    <div
      {...rest}
      ref={mergeRefs(ctx.contentRef, forwardedRef)}
      id={ctx.contentId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={ctx.headingId ?? undefined}
      tabIndex={-1}
      data-side="bottom"
      data-popover-content=""
      className={clsx(styles.content, className)}
    >
      {children}
    </div>,
    document.body,
  );
});
