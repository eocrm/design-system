import { forwardRef, type HTMLAttributes } from 'react';
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

  // Floating UI integration lands in Task 9. For now the panel is portaled
  // with no positioning — useful only for verifying ARIA + structure.
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
