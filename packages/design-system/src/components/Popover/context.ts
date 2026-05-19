import { createContext, useContext, type RefObject } from 'react';

export interface PopoverContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  contentId: string;
  headingId: string | null;
  setHeadingId: (id: string | null) => void;
  closeAll: () => void;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(componentName: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) {
    throw new Error(`<Popover.${componentName}> must be used inside <Popover>.`);
  }
  return ctx;
}
