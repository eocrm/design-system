import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
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

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
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
  children: ReactNode;
}

function DropdownMenuRoot({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const contentId = `dropdown-menu-${reactId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const value: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentId,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}

export interface DropdownMenuTriggerProps {
  children: ReactElement;
}

function Trigger({ children }: DropdownMenuTriggerProps) {
  const ctx = useDropdownMenuContext('Trigger');

  if (!isValidElement(children)) {
    throw new Error('<DropdownMenu.Trigger> requires exactly one React element child.');
  }

  const childProps = children.props as {
    onPointerDown?: (e: PointerEvent) => void;
    ref?: Ref<HTMLElement>;
  };

  // Toggle on pointerdown rather than click. Keyboard activation (Enter/Space)
  // would otherwise fire a synthesized click that races the keydown-open
  // handler (added in a later task) and double-toggles the menu shut.
  // Pointerdown is mouse/touch only; keyboard activation will route through
  // onKeyDown when that handler lands.
  const handlePointerDown = useCallback(
    (_e: PointerEvent) => {
      ctx.setOpen(!ctx.open);
    },
    [ctx],
  );

  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childProps.ref),
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onPointerDown: chain(childProps.onPointerDown, handlePointerDown),
  } as Partial<unknown> as object);
}

export type DropdownMenuSide = 'top' | 'bottom';
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
  sideOffset?: number;
  minWidth?: number | string;
}

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

  const { refs, floatingStyles } = useFloating({
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

  const setFloatingRef = mergeRefs<HTMLDivElement>(refs.setFloating, forwardedRef);

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
  };

  if (!ctx.open) return null;

  return createPortal(
    <div
      ref={setFloatingRef}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      aria-orientation="vertical"
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

export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  onSelect: () => void;
  tone?: DropdownMenuItemTone;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  { onSelect, tone = 'default', icon, shortcut, disabled = false, className, children, ...rest },
  ref,
) {
  const ctx = useDropdownMenuContext('Item');

  const handleClick = (_e: MouseEvent) => {
    if (disabled) return;
    onSelect();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  };

  return (
    // {...rest} last so consumer can override non-semantic props; role/aria-disabled are
    // set explicitly after the spread to preserve the ARIA contract.
    <div
      ref={ref}
      role="menuitem"
      tabIndex={-1}
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

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

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
