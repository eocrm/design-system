import {
  cloneElement,
  isValidElement,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { usePopoverContext } from './context';
import { chain, mergeRefs } from '../_internal/refs';

export interface PopoverTriggerProps {
  /**
   * Exactly one React element that accepts a ref. The Trigger clones this
   * element to inject `aria-haspopup="dialog"`, `aria-expanded`,
   * `aria-controls`, a click handler that toggles the popover, and a keydown
   * handler that opens on Enter/Space. `<Button>` and raw `<button>` both
   * qualify; a custom component without `forwardRef` does not.
   */
  children: ReactElement;
}

/**
 * Clones its single child element to inject ref + ARIA + the click handler
 * that toggles the popover. Child must accept a ref (`forwardRef` if it's
 * a custom component; raw `<button>` or this library's `<Button>` both
 * qualify).
 *
 * @example
 * <Popover.Trigger>
 *   <Button variant="secondary">Filters</Button>
 * </Popover.Trigger>
 */
export function Trigger({ children }: PopoverTriggerProps) {
  const ctx = usePopoverContext('Trigger');

  if (!isValidElement(children)) {
    throw new Error('<Popover.Trigger> requires exactly one React element child.');
  }

  const childProps = children.props as {
    ref?: Ref<HTMLElement>;
    onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void;
  };

  const handleClick = useCallback(
    (_e: ReactMouseEvent<HTMLElement>) => {
      ctx.setOpen(!ctx.open);
    },
    [ctx],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (ctx.open) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ctx.setOpen(true);
      }
    },
    [ctx],
  );

  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childProps.ref),
    'aria-haspopup': 'dialog',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onClick: chain(childProps.onClick, handleClick),
    onKeyDown: chain(childProps.onKeyDown, handleKeyDown),
  } as object);
}
