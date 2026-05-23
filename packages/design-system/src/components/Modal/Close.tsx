import {
  cloneElement,
  isValidElement,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { useModalContext } from './context';
import { chain } from '../_internal/refs';

export interface ModalCloseProps {
  /**
   * Exactly one React element. Close clones this element to inject an
   * `onClick` that closes the modal, chained with the child's existing
   * `onClick` (consumer runs first).
   */
  children: ReactElement;
}

/**
 * Wraps any single element with an onClick that closes the modal.
 * Useful for Cancel buttons inside `<Modal.Footer>`.
 *
 * @example
 * <Modal.Close>
 *   <Button variant="secondary">Cancel</Button>
 * </Modal.Close>
 */
export function Close({ children }: ModalCloseProps) {
  const ctx = useModalContext('Close');

  if (!isValidElement(children)) {
    throw new Error('<Modal.Close> requires exactly one React element child.');
  }

  const childProps = children.props as {
    onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  };

  const handleClick = useCallback(
    (_e: ReactMouseEvent<HTMLElement>) => {
      ctx.setOpen(false);
    },
    [ctx],
  );

  return cloneElement(children, {
    onClick: chain(childProps.onClick, handleClick),
  } as object);
}
