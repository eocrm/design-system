import { useCallback, useRef, useState } from 'react';

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

export interface UseSelectStateReturn {
  /** Current value — `string` in single mode, `string[]` in multi. */
  value: string | string[];
  /** Replace the entire selection. */
  setValue: (next: string | string[]) => void;
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
 */
export function useSelectState(args: UseSelectStateArgs): UseSelectStateReturn {
  const { multiple, value, defaultValue, onChange, open, defaultOpen, onOpenChange } = args;

  const [internalValue, setInternalValue] = useState<string | string[]>(
    () => defaultValue ?? emptyValue(multiple),
  );
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen ?? false);

  const isControlledValue = value !== undefined;
  const isControlledOpen = open !== undefined;

  // Stable refs so the returned callbacks have stable identity even though
  // they read fresh values on every invocation.
  const stateRef = useRef({
    multiple,
    isControlledValue,
    isControlledOpen,
    currentValue: isControlledValue ? value : internalValue,
    onChange,
    onOpenChange,
  });
  stateRef.current = {
    multiple,
    isControlledValue,
    isControlledOpen,
    currentValue: isControlledValue ? value : internalValue,
    onChange,
    onOpenChange,
  };

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
