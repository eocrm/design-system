import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { PopoverContext, type PopoverContextValue } from './context';
import { sanitizeId } from '../_internal/refs';

export interface PopoverProps {
  /** Must contain exactly one `<Popover.Trigger>` and one `<Popover.Content>`. */
  children: ReactNode;
  /** Controlled open state. Provide alongside `onOpenChange`. */
  open?: boolean;
  /** Fired whenever Popover wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
  /**
   * Reserved future hint. v1 ignores the value and always renders non-modal.
   * Will gate focus-trap + inert background once `<Modal>` lands.
   */
  modal?: boolean;
}

export function PopoverRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  modal: _modal = false,
}: PopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolled(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const contentId = `popover-${sanitizeId(reactId)}`;
  const [headingId, setHeadingId] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const value: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId,
    headingId,
    setHeadingId,
    closeAll,
  };

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}
