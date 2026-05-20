import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface UseSelectStateArgs {
  /** When `true`, value is a `string[]`; when `false`, a `string`. */
  multiple: boolean;
  /** Controlled value. When defined, internal state is bypassed. */
  value?: string | string[];
  /** Initial value when uncontrolled. Falls back to `''` (single) / `[]` (multi). */
  defaultValue?: string | string[];
  /** Fires on every commit, including in controlled mode (where state stays put). */
  onChange?: (value: string | string[]) => void;
  /** Controlled open. When defined, internal open state is bypassed. */
  open?: boolean;
  /** Initial open when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Fires on every commit to open state, including in controlled mode. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Return shape of `useSelectState`, parameterized by the value type so
 * overloads can narrow `value` / `setValue` based on `multiple`.
 */
export interface UseSelectStateReturn<V extends string | string[] = string | string[]> {
  /** Current value — `string` in single mode, `string[]` in multi. */
  value: V;
  /** Replace the entire selection. */
  setValue: (next: V) => void;
  /**
   * Multi: toggle membership of `v` (add when missing, remove when present).
   * Single: equivalent to `setValue(v)`.
   */
  toggleValue: (v: string) => void;
  /** Current open state. */
  open: boolean;
  /** Set open state. */
  setOpen: (next: boolean) => void;
}

interface StateRefShape {
  multiple: boolean;
  isControlledValue: boolean;
  isControlledOpen: boolean;
  currentValue: string | string[];
  onChange?: (value: string | string[]) => void;
  onOpenChange?: (open: boolean) => void;
}

const emptyValue = (multiple: boolean): string | string[] => (multiple ? [] : '');

/**
 * Combined reducer-like state for Select: controlled/uncontrolled value
 * and open state, plus a multi-aware `toggleValue` helper.
 *
 * Controlled vs. uncontrolled is decided per-axis (value, open):
 *  - `value !== undefined` → controlled. `setValue` / `toggleValue` fire
 *    `onChange` but do NOT update internal state.
 *  - `open !== undefined` → controlled. `setOpen` fires `onOpenChange`
 *    but does NOT update internal state.
 *
 * @example
 *   const { value, setValue } = useSelectState({ multiple: false });
 *   // value is typed as `string`
 *
 * @example
 *   const { value, setValue } = useSelectState({ multiple: true });
 *   // value is typed as `string[]`
 */
export function useSelectState(
  args: UseSelectStateArgs & { multiple: false },
): UseSelectStateReturn<string>;
export function useSelectState(
  args: UseSelectStateArgs & { multiple: true },
): UseSelectStateReturn<string[]>;
export function useSelectState(args: UseSelectStateArgs): UseSelectStateReturn;
// Implementation signature: intentionally permissive — public callers see one
// of the three overloads above. `UseSelectStateReturn<string | string[]>`
// would not be a valid supertype of `UseSelectStateReturn<string>` because
// `setValue` is contravariant in V.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSelectState(args: UseSelectStateArgs): UseSelectStateReturn<any> {
  const { multiple, value, defaultValue, onChange, open, defaultOpen, onOpenChange } = args;

  const [internalValue, setInternalValue] = useState<string | string[]>(
    () => defaultValue ?? emptyValue(multiple),
  );
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen ?? false);

  const isControlledValue = value !== undefined;
  const isControlledOpen = open !== undefined;

  // Stable refs so the returned callbacks have stable identity even though
  // they read fresh values on every invocation. The ref is seeded with the
  // initial values and refreshed in a layout effect — assigning during render
  // would violate React's render-purity rule under StrictMode / concurrent
  // rendering (a discarded render could mutate state observed by a
  // not-yet-committed update).
  const stateRef = useRef<StateRefShape>({
    multiple,
    isControlledValue,
    isControlledOpen,
    currentValue: isControlledValue ? (value as string | string[]) : internalValue,
    onChange,
    onOpenChange,
  });
  useLayoutEffect(() => {
    stateRef.current = {
      multiple,
      isControlledValue,
      isControlledOpen,
      currentValue: isControlledValue ? (value as string | string[]) : internalValue,
      onChange,
      onOpenChange,
    };
  });

  const setValue = useCallback((next: string | string[]) => {
    const s = stateRef.current;
    if (!s.isControlledValue) {
      setInternalValue(next);
    }
    s.onChange?.(next);
  }, []);

  const toggleValue = useCallback((v: string) => {
    const s = stateRef.current;
    if (!s.multiple) {
      if (!s.isControlledValue) {
        setInternalValue(v);
      }
      s.onChange?.(v);
      return;
    }
    const current = (s.currentValue as string[]) ?? [];
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    if (!s.isControlledValue) {
      setInternalValue(next);
    }
    s.onChange?.(next);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    const s = stateRef.current;
    if (!s.isControlledOpen) {
      setInternalOpen(next);
    }
    s.onOpenChange?.(next);
  }, []);

  return {
    value: isControlledValue ? (value as string | string[]) : internalValue,
    setValue,
    toggleValue,
    open: isControlledOpen ? (open as boolean) : internalOpen,
    setOpen,
  };
}
