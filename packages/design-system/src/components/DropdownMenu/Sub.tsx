import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DropdownMenuContext,
  useDropdownMenuContext,
  type DropdownMenuContextValue,
  type RegisteredItem,
} from './context';
import { sanitizeId } from './utils';

export interface DropdownMenuSubProps {
  /** The submenu trigger and content to render. */
  children: ReactNode;
  /** Controlled open state. When provided, `defaultOpen` is ignored. */
  open?: boolean;
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean;
}

/**
 * Submenu container. Creates a new DropdownMenuContext that shadows the
 * parent — submenu items register in this context, dismissal is scoped here.
 * `closeAll()` chains up to the parent's closeAll, producing cascading-close
 * semantics for leaf item selection.
 *
 * Must contain exactly one `<DropdownMenu.SubTrigger>` and one
 * `<DropdownMenu.SubContent>`.
 *
 * @remarks
 * Do NOT use Sub for top-level sections — use `<DropdownMenu.Group>` +
 * `<DropdownMenu.Label>` instead. Sub is only for nested flyout menus.
 *
 * @example
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={...}>...</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 */
export function Sub({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DropdownMenuSubProps) {
  const parentCtx = useDropdownMenuContext('Sub');

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
  const reactId = useId();
  const contentId = `dropdown-menu-sub-${sanitizeId(reactId)}`;
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

  // Reset activeIndex when this sub closes.
  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  // closeAll: close THIS sub, then walk up via parent.
  const closeAll = useCallback(() => {
    setOpen(false);
    parentCtx.closeAll();
  }, [setOpen, parentCtx]);

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
    depth: parentCtx.depth + 1,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}
