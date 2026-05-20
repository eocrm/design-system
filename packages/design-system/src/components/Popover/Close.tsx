import {
  cloneElement,
  isValidElement,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { usePopoverContext } from './context';
import { chain } from '../_internal/refs';

export interface PopoverCloseProps {
  /**
   * Exactly one React element. The Close clones this element to inject an
   * `onClick` that closes the popover, chained with the child's existing
   * `onClick` (consumer runs first).
   */
  children: ReactElement;
}

/**
 * Wraps any single element with an onClick that closes the popover.
 * Useful for "Cancel", "Apply", or "✕" buttons inside `<Popover.Content>`.
 * Consumer's onClick chains and runs first.
 *
 * @example
 * <Popover.Close>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 * </Popover.Close>
 */
export function Close({ children }: PopoverCloseProps) {
  const ctx = usePopoverContext('Close');

  if (!isValidElement(children)) {
    throw new Error('<Popover.Close> requires exactly one React element child.');
  }

  const childProps = children.props as {
    onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  };

  const handleClick = useCallback(
    (_e: ReactMouseEvent<HTMLElement>) => {
      ctx.closeAll();
    },
    [ctx],
  );

  return cloneElement(children, {
    onClick: chain(childProps.onClick, handleClick),
  } as object);
}
