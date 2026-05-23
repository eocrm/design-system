import { createContext, useContext, type KeyboardEvent, type MutableRefObject } from 'react';
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
  /** Item registers itself on mount with its value, disabled flag, and a ref to its DOM node. */
  registerItem: (
    value: string,
    disabled: boolean,
    ref: MutableRefObject<HTMLButtonElement | null>,
  ) => void;
  /** Item unregisters on unmount. */
  unregisterItem: (value: string) => void;
  /** Item delegates its keydown to the parent for Arrow/Home/End handling. */
  handleItemKeyDown: (e: KeyboardEvent<HTMLButtonElement>, value: string) => void;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

export function useButtonGroupContext(componentName: string): ButtonGroupContextValue {
  const ctx = useContext(ButtonGroupContext);
  if (!ctx) {
    throw new Error(`<ButtonGroup.${componentName}> must be used inside <ButtonGroup>.`);
  }
  return ctx;
}
