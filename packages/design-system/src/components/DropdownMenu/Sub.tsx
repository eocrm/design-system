import {
  createContext,
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
import { Content, type DropdownMenuContentProps } from './Content';

interface SubHoverContextValue {
  closeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

const SubHoverContext = createContext<SubHoverContextValue | null>(null);

function useSubHoverContext(component: string) {
  const ctx = useContext(SubHoverContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu.Sub>`);
  }
  return ctx;
}

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

  const sharedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <SubHoverContext.Provider value={{ closeTimerRef: sharedCloseTimerRef }}>
        <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>
      </SubHoverContext.Provider>
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
    const hoverCtx = useSubHoverContext('SubTrigger');
    const closeTimerRef = hoverCtx.closeTimerRef;

    const triggerRefLocal = useRef<HTMLDivElement | null>(null);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Cleanup on unmount.
    useEffect(() => {
      return () => {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      };
    }, [closeTimerRef]);

    const handlePointerEnter = useCallback(() => {
      if (disabled) return;
      // Cancel any pending close.
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (subCtx.open) return;
      openTimerRef.current = setTimeout(() => {
        subCtx.setOpen(true);
        openTimerRef.current = null;
      }, 100);
    }, [disabled, subCtx, closeTimerRef]);

    const handlePointerLeave = useCallback(() => {
      // Cancel pending open.
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      if (!subCtx.open) return;
      closeTimerRef.current = setTimeout(() => {
        subCtx.setOpen(false);
        closeTimerRef.current = null;
      }, 200);
    }, [subCtx, closeTimerRef]);

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
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
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

export type DropdownMenuSubContentProps = DropdownMenuContentProps;

/**
 * Floating panel for a submenu. Thin wrapper around `<Content>` — Content's
 * existing handleKeyDown handles ArrowLeft when `depth > 0` (closes this sub,
 * focuses its SubTrigger). Position defaults match `<Content>`; consumers
 * may set `side="right"` for classic side-by-side submenu layout.
 */
export const SubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  function SubContent(props, ref) {
    const hoverCtx = useSubHoverContext('SubContent');
    const subCtx = useDropdownMenuContext('SubContent');

    const handlePointerEnter = useCallback(() => {
      // Cancel pending close — mouse is back inside the chain.
      if (hoverCtx.closeTimerRef.current) {
        clearTimeout(hoverCtx.closeTimerRef.current);
        hoverCtx.closeTimerRef.current = null;
      }
    }, [hoverCtx]);

    const handlePointerLeave = useCallback(() => {
      if (!subCtx.open) return;
      if (hoverCtx.closeTimerRef.current) clearTimeout(hoverCtx.closeTimerRef.current);
      hoverCtx.closeTimerRef.current = setTimeout(() => {
        subCtx.setOpen(false);
        hoverCtx.closeTimerRef.current = null;
      }, 200);
    }, [hoverCtx, subCtx]);

    return (
      <Content
        ref={ref}
        {...props}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />
    );
  },
);
