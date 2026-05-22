import { useCallback, useRef, useState } from 'react';
import type { Updater } from './types';

/**
 * Radix-style controlled/uncontrolled state hook.
 *
 * - If `value` is defined → controlled. Resolved value tracks `value`. Setter
 *   does NOT update internal state; only fires `onChange` so the consumer can
 *   update their own state.
 * - If `value` is undefined → uncontrolled. Resolved value comes from internal
 *   state seeded with `defaultValue`. Setter updates internal state AND fires
 *   `onChange`.
 *
 * Switching between controlled and uncontrolled across renders is not supported
 * (matches Radix / React behavior — produces a warning in dev only on first
 * such switch in React, but otherwise no-op).
 */
export function useControllableState<T>(options: {
  value?: T;
  defaultValue?: T;
  onChange?: (next: T) => void;
}): [T, (updater: Updater<T>) => void] {
  const { value, defaultValue, onChange } = options;
  const isControlled = value !== undefined;

  const [internal, setInternal] = useState<T | undefined>(defaultValue);
  const resolved = (isControlled ? value : internal) as T;

  // Keep a ref to the most recent resolved value so updater functions
  // always operate on the latest state even if callers debounce or batch.
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback(
    (updater: Updater<T>) => {
      const prev = resolvedRef.current;
      const next =
        typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );

  return [resolved, setValue];
}
