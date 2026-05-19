import type { Ref } from 'react';

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

export function chain<E>(...fns: Array<((event: E) => void) | undefined>): (event: E) => void {
  return (event: E) => {
    for (const fn of fns) fn?.(event);
  };
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}
