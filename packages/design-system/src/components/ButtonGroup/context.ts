import { createContext, useContext, type KeyboardEvent } from 'react';
import type { ButtonSize } from '../Button';

/** Matches Button's size scale. */
export type ButtonGroupSize = ButtonSize;

export interface ButtonGroupContextValue {
  /** Currently-selected value. Set when in segmented mode. */
  value: string;
  /** Fires on selection change. */
  onValueChange: (next: string) => void;
  /** Group-level size, propagated to Items via context. */
  size: ButtonGroupSize;
  /** Group-level disabled. Individual Items can also be disabled. */
  disabled: boolean;
  /** Item delegates its keydown to the parent for Arrow/Home/End handling. */
  handleItemKeyDown: (e: KeyboardEvent<HTMLButtonElement>, value: string) => void;
  /**
   * Value of the item that should hold the group's single tab stop when
   * NOTHING is selected, or `null` when something is.
   *
   * The roving tabindex was `isSelected ? 0 : -1`, so a group whose `value`
   * matched no item — the ordinary initial state of a single-select group with
   * nothing chosen — gave every item `tabIndex={-1}` and the radiogroup itself
   * none. Tab skipped the whole control, and since the arrow keys live on the
   * items, roving navigation could never be entered either: a WCAG 2.1.1
   * failure for the unselected state. WAI-ARIA APG: "If no radio button is
   * checked, the first radio button in the group receives focus."
   *
   * Resolved from the DOM rather than from registration order, for the same
   * reason `handleItemKeyDown` queries the DOM — consumer-reordered children
   * must be walked in their actual visual order.
   */
  rovingFallbackValue: string | null;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

export function useButtonGroupContext(componentName: string): ButtonGroupContextValue {
  const ctx = useContext(ButtonGroupContext);
  if (!ctx) {
    throw new Error(`<ButtonGroup.${componentName}> must be used inside <ButtonGroup>.`);
  }
  return ctx;
}
