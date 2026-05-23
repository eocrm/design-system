import {
  cloneElement,
  isValidElement,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { useDrawerContext } from './context';
import { chain } from '../_internal/refs';

export interface DrawerCloseProps {
  /**
   * Exactly one React element. Close clones it to inject an onClick that
   * closes the drawer, chained with the child's existing onClick.
   */
  children: ReactElement;
}

/**
 * @example
 * <Drawer.Close>
 *   <Button variant="secondary">Cancel</Button>
 * </Drawer.Close>
 */
export function Close({ children }: DrawerCloseProps) {
  const ctx = useDrawerContext('Close');
  if (!isValidElement(children)) {
    throw new Error('<Drawer.Close> requires exactly one React element child.');
  }
  const childProps = children.props as {
    onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  };
  const handleClick = useCallback(
    (_e: ReactMouseEvent<HTMLElement>) => ctx.setOpen(false),
    [ctx],
  );
  return cloneElement(children, {
    onClick: chain(childProps.onClick, handleClick),
  } as object);
}
