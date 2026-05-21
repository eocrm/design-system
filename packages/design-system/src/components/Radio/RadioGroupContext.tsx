import { createContext, useContext, type ChangeEvent } from 'react';
import type { RadioSize } from './Radio';

export interface RadioGroupContextValue {
  /** Form name shared by every radio in the group. */
  name: string;
  /** Currently-selected value (or `null` if none). */
  value: string | null;
  /** Called when any child radio is selected. */
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Default size for child radios. Per-child explicit `size` wins. */
  size: RadioSize;
  /** When true, every child radio is disabled (per-child explicit override still wins). */
  disabled: boolean;
  /** When true, every child radio shows the invalid visual. */
  invalid: boolean;
  /** When true, every child radio carries the native `required` attribute. */
  required: boolean;
}

/**
 * Internal context — `<RadioGroup>` sets it, descendant `<Radio>`s read it.
 * `null` means the radio is standalone.
 */
export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/** Read the surrounding RadioGroup context; `null` when standalone. */
export function useRadioGroup(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}
