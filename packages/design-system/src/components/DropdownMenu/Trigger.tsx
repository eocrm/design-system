import {
  cloneElement,
  isValidElement,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { useDropdownMenuContext } from './context';
import { chain, mergeRefs } from './utils';

export interface DropdownMenuTriggerProps {
  /**
   * Exactly one React element. The Trigger clones this element to inject a
   * ref, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and the
   * pointerdown/keyboard handlers that open the menu. The child must accept
   * a ref (i.e. use `forwardRef` if it's a custom component); a raw
   * `<button>` or the library's `<Button>` both qualify.
   */
  children: ReactElement;
}

/**
 * Clones its single child element to inject the open-toggle handlers and
 * ARIA. The child must accept a ref (forwardRef or a native element).
 */
export function Trigger({ children }: DropdownMenuTriggerProps) {
  const ctx = useDropdownMenuContext('Trigger');

  if (!isValidElement(children)) {
    throw new Error('<DropdownMenu.Trigger> requires exactly one React element child.');
  }

  const childProps = children.props as {
    onPointerDown?: (e: PointerEvent) => void;
    onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void;
    ref?: Ref<HTMLElement>;
  };

  // Toggle on pointerdown rather than click. Keyboard activation (Enter/Space)
  // fires a synthesized click that would race a keydown-open handler and
  // double-toggle the menu shut. Pointerdown is mouse/touch only; keyboard
  // activation routes through onKeyDown below.
  const handlePointerDown = useCallback(
    (_e: PointerEvent) => {
      ctx.setOpen(!ctx.open);
    },
    [ctx],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (ctx.open) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        ctx.setOpenIntent('first');
        ctx.setOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ctx.setOpenIntent('last');
        ctx.setOpen(true);
      }
    },
    [ctx],
  );

  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childProps.ref),
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onPointerDown: chain(childProps.onPointerDown, handlePointerDown),
    onKeyDown: chain(childProps.onKeyDown, handleKeyDown),
  } as Partial<unknown> as object);
}
