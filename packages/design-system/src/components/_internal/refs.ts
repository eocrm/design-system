import type { Ref } from 'react';

/**
 * Merge multiple refs into one. Each provided ref (callback or object) is set
 * to the same value. Used by components that clone a child element and want
 * to attach an internal ref alongside the consumer's own ref.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

/**
 * Chain event handlers. Each provided handler runs in order with the same
 * event. Used when a cloned element already has an `onX` and the wrapping
 * component needs to add its own without overwriting.
 */
export function chain<E>(...fns: Array<((event: E) => void) | undefined>): (event: E) => void {
  return (event: E) => {
    for (const fn of fns) fn?.(event);
  };
}

/**
 * Convert React's `useId()` output into a value safe to interpolate into a
 * CSS-style id or class. Replaces every char that isn't `[A-Za-z0-9_-]` with
 * an underscore.
 */
export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Merge a consumer-supplied `aria-describedby` with an additional id, keeping
 * the consumer's value first and de-duplicating. Returns the additional id
 * alone when the consumer didn't provide one.
 */
export function mergeAriaDescribedby(consumer: string | undefined, extra: string): string {
  if (!consumer) return extra;
  const tokens = consumer.split(/\s+/).filter(Boolean);
  if (tokens.includes(extra)) return consumer;
  return [...tokens, extra].join(' ');
}
