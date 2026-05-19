import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

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

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content: function Content() {
    return null;
  },
  Item: function Item() {
    return null;
  },
  Separator: function Separator() {
    return null;
  },
});
