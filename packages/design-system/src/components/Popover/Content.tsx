import { forwardRef, useEffect, useLayoutEffect, useRef, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { usePopoverContext } from './context';
import { mergeRefs } from '../_internal/refs';
import styles from './Popover.module.scss';

/** Which side of the trigger the popover prefers. Floating UI auto-flips if it doesn't fit. */
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
  /**
   * Minimum width in px or any CSS length. Defaults to the token
   * `--size-popover-min-width` (220px) applied via SCSS.
   */
  minWidth?: number | string;
}

/**
 * The floating panel itself. Portaled to `document.body`, positioned by
 * Floating UI (auto-flip, viewport-aware), animated via `@starting-style`
 * on open. `role="dialog"`, `aria-modal="false"`, `tabIndex={-1}` so it
 * can receive focus on open. Renders an aria-hidden arrow that tracks
 * the trigger.
 */
export const Content = forwardRef<HTMLDivElement, PopoverContentProps>(function Content(
  { side = 'bottom', align = 'center', sideOffset = 10, minWidth, className, children, ...rest },
  forwardedRef,
) {
  const ctx = usePopoverContext('Content');
  const arrowRef = useRef<HTMLSpanElement | null>(null);

  const placement: Placement = (align === 'center' ? side : `${side}-${align}`) as Placement;

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
  } = useFloating({
    open: ctx.open,
    placement,
    transform: false,
    middleware: [offset(sideOffset), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRef.current },
  });

  const resolvedSide = resolvedPlacement.split('-')[0] as PopoverSide;
  const staticSide = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[
    resolvedSide
  ];

  // Focus the panel on open. preventScroll matches DropdownMenu/Tooltip.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    queueMicrotask(() => ctx.contentRef.current?.focus({ preventScroll: true }));
  }, [ctx.open, ctx.contentRef]);

  // Escape closes; capture phase fires before focused widgets that may
  // stopPropagation.
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

  // Outside-click closes.
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

  const arrowXY = middlewareData.arrow;
  const minWidthStyle =
    minWidth !== undefined
      ? typeof minWidth === 'number'
        ? `${minWidth}px`
        : minWidth
      : undefined;

  return createPortal(
    <div
      {...rest}
      ref={mergeRefs<HTMLDivElement>(ctx.contentRef, refs.setFloating, forwardedRef)}
      id={ctx.contentId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={ctx.headingId ?? undefined}
      tabIndex={-1}
      data-side={resolvedSide}
      data-popover-content=""
      style={{ ...floatingStyles, minWidth: minWidthStyle }}
      className={clsx(styles.content, className)}
    >
      {children}
      <span
        ref={arrowRef}
        aria-hidden="true"
        className={styles.arrow}
        style={{
          left: typeof arrowXY?.x === 'number' ? `${arrowXY.x}px` : undefined,
          top: typeof arrowXY?.y === 'number' ? `${arrowXY.y}px` : undefined,
          [staticSide]: '-6px',
        }}
      />
    </div>,
    document.body,
  );
});
