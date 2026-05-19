import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import {
  DropdownMenuContext,
  SubParentContext,
  useDropdownMenuContext,
  type DropdownMenuContextValue,
  type RegisteredItem,
} from './context';
import { mergeRefs, sanitizeId } from './utils';
import styles from './DropdownMenu.module.scss';

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

  return (
    <SubParentContext.Provider value={parentCtx}>
      <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>
    </SubParentContext.Provider>
  );
}

export interface DropdownMenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
  /** Disabled SubTrigger renders dimmed and doesn't open the sub. */
  disabled?: boolean;
  /** Optional leading icon, matching Item's icon slot. */
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Trigger for a submenu. Renders as a menuitem in the PARENT menu with a
 * trailing chevron. Click / hover (Task 11) / ArrowRight (Task 12) opens
 * the sub.
 *
 * @remarks
 * Must be a direct child of `<DropdownMenu.Sub>`. Do NOT place SubTrigger
 * outside a Sub — it has no meaning without the sub context pair.
 *
 * @example
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={...}>Nested item</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 */
export const SubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  function SubTrigger({ disabled = false, icon, className, children, ...rest }, forwardedRef) {
    const subCtx = useDropdownMenuContext('SubTrigger');
    const parentCtx = useContext(SubParentContext);
    if (!parentCtx) {
      throw new Error('<DropdownMenu.SubTrigger> must be used inside <DropdownMenu.Sub>');
    }

    const triggerRefLocal = useRef<HTMLDivElement | null>(null);
    const id = useId();
    const labelText = typeof children === 'string' ? children : '';

    // Register with PARENT's registry — SubTrigger IS a menuitem in the parent
    // menu. openSubmenu lets ArrowRight (Task 12) invoke this from the parent.
    useLayoutEffect(() => {
      return parentCtx.registerItem({
        id,
        ref: triggerRefLocal,
        disabled,
        label: labelText,
        openSubmenu: () => {
          subCtx.setOpenIntent('first');
          subCtx.setOpen(true);
        },
      });
    }, [parentCtx, id, disabled, labelText, subCtx]);

    const index = parentCtx.itemsRef.current.findIndex((x) => x.id === id);
    const isActive = index !== -1 && index === parentCtx.activeIndex;

    // Also save into subCtx.triggerRef so SubContent (Task 10) positions
    // against the SubTrigger element.
    useLayoutEffect(() => {
      subCtx.triggerRef.current = triggerRefLocal.current;
    });

    const handleClick = (_e: MouseEvent) => {
      if (disabled) return;
      subCtx.setOpen(true);
    };

    return (
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(triggerRefLocal, forwardedRef)}
        role="menuitem"
        tabIndex={isActive ? 0 : -1}
        aria-haspopup="menu"
        aria-expanded={subCtx.open}
        aria-controls={subCtx.open ? subCtx.contentId : undefined}
        aria-disabled={disabled || undefined}
        data-state={subCtx.open ? 'open' : 'closed'}
        className={clsx(styles.item, styles.subTrigger, className)}
        onClick={handleClick}
      >
        {icon !== undefined && <span className={styles.icon}>{icon}</span>}
        <span className={styles.itemLabel}>{children}</span>
        <span className={styles.subTriggerChevron} aria-hidden="true">
          ▶
        </span>
      </div>
    );
  },
);
