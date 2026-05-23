import { createContext, useContext } from 'react';

export interface AccordionContextValue {
  /** Selection mode. */
  mode: 'single' | 'multiple';
  /** Whether the given item value is currently open. */
  isOpen: (value: string) => boolean;
  /** Toggle the given item value. Closes others in single mode; flips membership in multiple mode. */
  toggle: (value: string) => void;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

/**
 * Hook for child components to read the root context. Throws if used outside
 * an `<Accordion>` — surfaces the bug early instead of silently no-op'ing.
 */
export function useAccordionContext(componentName: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (ctx === null) {
    throw new Error(`<Accordion.${componentName}> must be used inside <Accordion>`);
  }
  return ctx;
}

export interface AccordionItemContextValue {
  /** This item's unique value. */
  value: string;
  /** Whether the item is disabled (Trigger non-interactive, keyboard nav skips). */
  disabled: boolean;
  /** Whether the item is currently open (mirrored from root context for convenience). */
  isOpen: boolean;
  /** Stable id for the Trigger (so Content's aria-labelledby points at it). */
  triggerId: string;
  /** Stable id for the Content (so Trigger's aria-controls points at it). */
  contentId: string;
}

export const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export function useAccordionItemContext(componentName: string): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (ctx === null) {
    throw new Error(`<Accordion.${componentName}> must be used inside <Accordion.Item>`);
  }
  return ctx;
}
