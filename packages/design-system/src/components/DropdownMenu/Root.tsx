import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DropdownMenuContext, type DropdownMenuContextValue, type RegisteredItem } from './context';
import { sanitizeId } from '../_internal/refs';
import { useFloatingSurface, useInOverlay } from '../_internal/overlay';

export interface DropdownMenuProps {
  /** Must contain exactly one `<DropdownMenu.Trigger>` and one `<DropdownMenu.Content>`. */
  children: ReactNode;
  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let DropdownMenu own its own state (the common
   * case).
   */
  open?: boolean;
  /** Fired whenever DropdownMenu wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

/**
 * Action menu that opens from a trigger button, implementing the WAI-ARIA menu pattern.
 * @see docs/components/DropdownMenu.md
 */
export function DropdownMenuRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DropdownMenuProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolledOpen(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const inOverlay = useInOverlay(triggerRef, open);
  // #274: hosts yield Escape while the menu (any level) is open — the
  // menu's own capture listeners peel one level per press instead. The id lets
  // Content defer to a DEEPER surface (e.g. a popover from an item) (#280).
  const floatingId = useFloatingSurface(open);
  const reactId = useId();
  const contentId = `dropdown-menu-${sanitizeId(reactId)}`;

  const [openIntent, setOpenIntent] = useState<'first' | 'last' | null>(null);

  const itemsRef = useRef<RegisteredItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const registerItem = useCallback((item: RegisteredItem) => {
    if (!itemsRef.current.some((x) => x.id === item.id)) {
      itemsRef.current.push(item);
    }
    return () => {
      itemsRef.current = itemsRef.current.filter((x) => x.id !== item.id);
    };
  }, []);

  // Reset registry indicator when menu closes. The registry array itself is
  // cleared by item unmount cleanups.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    }
  }, [open]);

  const closeAll = useCallback(() => {
    setOpen(false);
    // preventScroll: focus() on the trigger after close shouldn't trigger
    // browser auto-scroll if the page happens to be scrolled (trigger is
    // already visible since the user just interacted with it).
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const value: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentId,
    openIntent,
    setOpenIntent,
    registerItem,
    itemsRef,
    activeIndex,
    setActiveIndex,
    closeAll,
    depth: 0,
    inOverlay,
    floatingId,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}
