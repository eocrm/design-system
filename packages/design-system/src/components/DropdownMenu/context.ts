import { createContext, useContext, type RefObject } from 'react';

export interface RegisteredItem {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  label: string;
  /** If this item is a SubTrigger, called when ArrowRight is pressed while it's the active item. Set by SubTrigger in later tasks. */
  openSubmenu?: () => void;
}

export interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
  registerItem: (item: RegisteredItem) => () => void;
  itemsRef: React.MutableRefObject<RegisteredItem[]>;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  /** Walks up the recursive context chain and closes every menu (root + all subs). Submenus override to chain. */
  closeAll: () => void;
  /** 0 = root menu, 1 = first-level submenu, etc. */
  depth: number;
}

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu>`);
  }
  return ctx;
}

export interface GroupContextValue {
  labelId: string;
}

export const GroupContext = createContext<GroupContextValue | null>(null);

export interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(component: string): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu.RadioGroup>`);
  }
  return ctx;
}

/** Provided by `<Sub>` so `<SubTrigger>` can read the PARENT context (where it registers as a menuitem) while still being inside the SUB's DropdownMenuContext provider. */
export const SubParentContext = createContext<DropdownMenuContextValue | null>(null);
