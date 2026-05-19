import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';

interface RegisteredItem {
  id: string;
  ref: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
  label: string;
}

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  /** Where the focus should land when Content registers its first item. Null when no intent is pending. */
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
  registerItem: (item: RegisteredItem) => () => void;
  itemsRef: React.MutableRefObject<RegisteredItem[]>;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu>`);
  }
  return ctx;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

function chain<E>(
  ...fns: Array<((event: E) => void) | undefined>
): (event: E) => void {
  return (event: E) => {
    for (const fn of fns) fn?.(event);
  };
}

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
 * Action menu that opens from a trigger button. Compound API — pair `<Trigger>`,
 * `<Content>`, `<Item>`, and `<Separator>` as direct (or nested) children.
 * Implements the WAI-ARIA menu pattern: roving tabindex inside Content,
 * Arrow/Home/End nav, typeahead, Enter/Space to activate, Escape/Tab to
 * dismiss. Content portals to `document.body` and positions itself relative
 * to the trigger via Floating UI (auto-flip, viewport-aware).
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="secondary">Actions</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">Duplicate</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item onSelect={remove} tone="danger">Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Table row kebab — minimal trigger via the ghost variant:
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="ghost" aria-label="Row actions">⋯</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={() => view(row)}>View</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={() => archive(row)}>Archive</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Controlled open (rare — usually let DropdownMenu manage state):
 * const [open, setOpen] = useState(false);
 * <DropdownMenu open={open} onOpenChange={setOpen}>...</DropdownMenu>
 *
 * @remarks When NOT to use
 * - For form value selection ("pick a status", "pick a country") → use
 *   `<Select>` (not yet shipped) so the value lives in form state.
 * - For an always-visible row of actions → use a `<Cluster>` of Buttons in
 *   a toolbar. Menus are for actions that don't deserve permanent screen real
 *   estate.
 * - For navigation between pages → use the sidebar or a `<Link>` (not yet
 *   shipped). Menu items are for *actions*, not page transitions.
 *
 * @remarks Anti-patterns
 * - ❌ Multiple `<DropdownMenu.Trigger>` inside one `<DropdownMenu>`. Use one
 *   DropdownMenu per trigger.
 * - ❌ Trigger child that doesn't accept a ref. The cloneElement contract
 *   needs `forwardRef` on the trigger element. `<Button>` qualifies; a raw
 *   `<button>` qualifies; a custom component that doesn't forward refs does
 *   not.
 * - ❌ `tone="danger"` for non-destructive actions like "Filter" or "Sort".
 *   Reserve danger for irreversible destructive operations.
 * - ❌ Nesting `<DropdownMenu>` inside another DropdownMenu. Submenus are
 *   out of scope for v1 and the focus / dismissal logic will fight you.
 */
function DropdownMenuRoot({
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
  const reactId = useId();
  const contentId = `dropdown-menu-${reactId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}

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
function Trigger({ children }: DropdownMenuTriggerProps) {
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

/** Which side of the trigger the menu prefers. Floating UI auto-flips if it doesn't fit. */
export type DropdownMenuSide = 'top' | 'bottom';
/** Which edge of the menu aligns to the corresponding trigger edge. */
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Default `'bottom'`. Auto-flips on collision. */
  side?: DropdownMenuSide;
  /** Edge alignment. Default `'start'`. */
  align?: DropdownMenuAlign;
  /** Gap in px between trigger and menu. Default `4`. */
  sideOffset?: number;
  /** Minimum width in px or any CSS length. Defaults to the trigger's width. */
  minWidth?: number | string;
}

/**
 * The floating menu panel. Renders only when the menu is open, portaled to
 * `document.body`, positioned by Floating UI. Owns the keyboard handlers
 * (Escape, Tab, Arrow, Home/End, Enter/Space, typeahead) and outside-click
 * dismissal.
 */
const Content = forwardRef<HTMLDivElement, DropdownMenuContentProps>(function Content(
  {
    side = 'bottom',
    align = 'start',
    sideOffset = 4,
    minWidth,
    className,
    children,
    ...rest
  },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Content');

  const placement: Placement = (align === 'center' ? side : `${side}-${align}`) as Placement;

  const { refs, floatingStyles, placement: resolvedPlacement } = useFloating({
    open: ctx.open,
    placement,
    middleware: [
      offset(sideOffset),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
            minWidth:
              typeof minWidth === 'number'
                ? `${minWidth}px`
                : (minWidth as string | undefined) ?? `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRef.current },
  });

  const [resolvedSide, resolvedAlign = 'center'] = resolvedPlacement.split('-') as [
    DropdownMenuSide,
    DropdownMenuAlign | undefined,
  ];

  const setFloatingRef = mergeRefs<HTMLDivElement>(refs.setFloating, forwardedRef);

  const typeaheadRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
    buffer: '',
    timer: null,
  });

  useEffect(() => {
    return () => {
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
    };
  }, []);

  // Outside-click: pointerdown on document, target is neither inside Content
  // nor inside the Trigger. Excluding the trigger prevents fighting the
  // trigger's own toggle handler.
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const content = refs.floating.current;
      const trigger = ctx.triggerRef.current;
      if (content && content.contains(target)) return;
      if (trigger && trigger.contains(target)) return;
      ctx.setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ctx, refs]);

  // Escape: close from anywhere (focus may be on the trigger or inside the menu).
  // Tab: close and return focus to trigger when focus is inside the menu.
  // These use document-level listeners so they fire regardless of which element
  // currently holds focus.
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        const content = refs.floating.current;
        const activeEl = document.activeElement as Node | null;
        // Only intercept Tab when focus is inside the menu.
        if (content && activeEl && content.contains(activeEl)) {
          e.preventDefault();
          ctx.setOpen(false);
          ctx.triggerRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ctx, refs]);

  // When the menu opens, set activeIndex from openIntent and focus the active item.
  // useLayoutEffect (not useEffect) so this runs after Items' layout effects
  // have populated itemsRef.current (layout effects fire bottom-up: children first).
  useLayoutEffect(() => {
    if (!ctx.open) return;
    const enabled = ctx.itemsRef.current.filter((x) => !x.disabled);
    if (enabled.length === 0) return;
    const target =
      ctx.openIntent === 'last' ? enabled[enabled.length - 1] : enabled[0];
    const idx = ctx.itemsRef.current.findIndex((x) => x.id === target.id);
    ctx.setActiveIndex(idx);
    // Focus on next microtask so the ref has attached and the re-render with
    // updated tabIndex has committed.
    queueMicrotask(() => target.ref.current?.focus());
    ctx.setOpenIntent(null);
    // Intentionally depend only on ctx.open so this fires exactly when the
    // menu transitions to open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      // Close and move focus to trigger; preventDefault so focus stays on
      // the trigger (jsdom/userEvent would otherwise advance past it).
      e.preventDefault();
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const items = ctx.itemsRef.current;
      if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
        const target = items[ctx.activeIndex];
        if (!target.disabled) {
          target.ref.current?.click();
        }
      }
      return;
    }

    const items = ctx.itemsRef.current;
    const enabledIndices = items
      .map((it, i) => (it.disabled ? -1 : i))
      .filter((i) => i !== -1);
    if (enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(ctx.activeIndex);

    const focusAt = (registryIndex: number) => {
      ctx.setActiveIndex(registryIndex);
      queueMicrotask(() => items[registryIndex].ref.current?.focus());
    };

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
        focusAt(enabledIndices[nextPos]);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevPos =
          currentPos === -1
            ? enabledIndices.length - 1
            : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
        focusAt(enabledIndices[prevPos]);
        return;
      }
      case 'Home': {
        e.preventDefault();
        focusAt(enabledIndices[0]);
        return;
      }
      case 'End': {
        e.preventDefault();
        focusAt(enabledIndices[enabledIndices.length - 1]);
        return;
      }
    }

    // Typeahead: printable characters (length 1) with no modifier keys append
    // to a debounced buffer and jump to the first non-disabled matching item.
    // This block comes AFTER Enter/Space and Arrow/Home/End so those keys are
    // not accidentally consumed here (' ' is length 1 but is caught above).
    if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const ta = typeaheadRef.current;
      ta.buffer += e.key.toLowerCase();
      if (ta.timer) clearTimeout(ta.timer);
      ta.timer = setTimeout(() => {
        ta.buffer = '';
        ta.timer = null;
      }, 500);

      const match = items.findIndex(
        (it) => !it.disabled && it.label.toLowerCase().startsWith(ta.buffer),
      );
      if (match !== -1) {
        e.preventDefault();
        ctx.setActiveIndex(match);
        queueMicrotask(() => items[match].ref.current?.focus());
      }
      return;
    }
  };

  if (!ctx.open) return null;

  return createPortal(
    <div
      ref={setFloatingRef}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      aria-orientation="vertical"
      data-side={resolvedSide}
      data-align={resolvedAlign}
      style={floatingStyles}
      className={clsx(styles.content, className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
});

/** Item color treatment. */
export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Called when the item is activated (click or Enter/Space). The consumer performs the action. */
  onSelect: () => void;
  /**
   * Visual tone.
   * - `'default'` — normal action.
   * - `'danger'` — destructive (Delete, Revoke, Remove). Reserve for irreversible operations.
   */
  tone?: DropdownMenuItemTone;
  /** Leading icon. Rendered in a fixed-size slot so labels stay aligned across items. */
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /** Disabled items are skipped by keyboard nav, dimmed, and don't fire `onSelect` on click. */
  disabled?: boolean;
}

/**
 * A selectable menu item. Self-registers with the DropdownMenu context for
 * keyboard navigation and typeahead. Fires `onSelect` on activation.
 */
const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  { onSelect, tone = 'default', icon, shortcut, disabled = false, className, children, ...rest },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Item');
  const itemRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // String children become the typeahead label. Non-string fall back to '';
  // typeahead won't match those, which is acceptable.
  const label = typeof children === 'string' ? children : '';

  // useLayoutEffect (not useEffect) so item registration completes BEFORE
  // Content's parent useLayoutEffect runs to set activeIndex on open.
  useLayoutEffect(() => {
    return ctx.registerItem({ id, ref: itemRef, disabled, label });
  }, [ctx, id, disabled, label]);

  const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
  const isActive = index !== -1 && index === ctx.activeIndex;

  const handleClick = (_e: MouseEvent) => {
    if (disabled) return;
    onSelect();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  };

  return (
    <div
      ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      aria-disabled={disabled || undefined}
      data-tone={tone}
      className={clsx(styles.item, className)}
      onClick={handleClick}
      {...rest}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});

/** Visual divider between groups of items. Decorative — `role="separator"`. */
export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

/** Decorative visual divider between groups of items. `role="separator"`, not focusable. */
const Separator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(function Separator(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} role="separator" className={clsx(styles.separator, className)} {...rest} />;
});

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
});
