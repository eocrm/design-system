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

/**
 * Props for `<DropdownMenu.Sub>`.
 *
 * Supports both controlled (`open` + `onOpenChange`) and uncontrolled
 * (`defaultOpen`) open-state patterns.
 */
export interface DropdownMenuSubProps {
  /**
   * The submenu trigger and content to render. Should contain exactly one
   * `<DropdownMenu.SubTrigger>` and one `<DropdownMenu.SubContent>`.
   */
  children: ReactNode;
  /** Controlled open state. When provided, `defaultOpen` is ignored. */
  open?: boolean;
  /** Called when the open state changes (user opens or closes the sub). */
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
 * @example
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={exportCsv}>CSV</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={exportJson}>JSON</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 *
 * @example
 * // Controlled open state:
 * <DropdownMenu.Sub open={subOpen} onOpenChange={setSubOpen}>
 *   <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={handleAction}>Action</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 *
 * @remarks When NOT to use
 * - For top-level sections — use `<DropdownMenu.Group>` + `<DropdownMenu.Label>`
 *   instead. Sub is only for nested flyout menus.
 * - For more than 2–3 levels of nesting. UX gets confusing fast; refactor
 *   the information architecture.
 * - On touch-first surfaces. Submenus rely on hover and lateral arrow keys;
 *   touch users have neither reliably.
 *
 * @remarks Anti-patterns
 * - ❌ Putting a SubTrigger outside a Sub. SubTrigger needs Sub's context.
 * - ❌ Multiple SubTriggers under one Sub. One sub = one trigger.
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

/**
 * Props for `<DropdownMenu.SubTrigger>`.
 *
 * Extends standard `div` HTML attributes. The ARIA attributes
 * (`role="menuitem"`, `aria-haspopup`, `aria-expanded`, `aria-controls`,
 * `aria-disabled`) are always set by the component.
 */
export interface DropdownMenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
  /** When `true`, the trigger renders dimmed and pointer/keyboard interaction does not open the sub. */
  disabled?: boolean;
  /** Optional leading icon. Rendered in a fixed-size slot, matching `<DropdownMenu.Item>`'s icon slot. */
  icon?: ReactNode;
  /** The trigger label text. String children participate in the parent menu's typeahead. */
  children: ReactNode;
}

/**
 * Trigger for a submenu. Renders as a menuitem in the PARENT menu with a
 * trailing chevron (`▶`). Click, hover (100 ms delay), Enter, Space, or
 * ArrowRight opens the sub; ArrowLeft (when inside the sub) closes it.
 *
 * Internally registers itself in the parent context's item registry so it
 * participates in keyboard navigation (Arrow keys, Home/End, typeahead) like
 * any other item in the parent menu.
 *
 * Must be used inside `<DropdownMenu.Sub>` — throws otherwise.
 *
 * @example
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={handleAction}>Action</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 *
 * @remarks When NOT to use
 * - Outside a `<DropdownMenu.Sub>` — throws in dev. Always pair SubTrigger
 *   with a Sub + SubContent.
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

/**
 * Props for `<DropdownMenu.SubContent>`.
 *
 * Identical to `<DropdownMenu.Content>` props — `side`, `align`,
 * `sideOffset`, `minWidth`, and standard `div` HTML attributes all apply.
 */
export type DropdownMenuSubContentProps = DropdownMenuContentProps;

/**
 * Floating panel for a submenu. Thin wrapper around `<Content>` — Content's
 * `handleKeyDown` handles ArrowLeft when `depth > 0`, closing this sub and
 * returning focus to the SubTrigger. Position defaults match `<Content>`.
 *
 * Adds hover-intent logic so moving the pointer from the SubTrigger into the
 * SubContent cancels the pending close timer, keeping the sub open while the
 * user moves between the trigger and the sub's items.
 *
 * @example
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <DropdownMenu.Item onSelect={exportCsv}>CSV</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={exportJson}>JSON</DropdownMenu.Item>
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
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
