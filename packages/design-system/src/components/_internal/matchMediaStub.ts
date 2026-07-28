import { act } from '@testing-library/react';

// jsdom implements no `window.matchMedia`, so this installs a width-driven
// stub that fires real `change` events — exercising a hook's subscription
// path, not just its initial read. Shared test helper — not exported from the
// package root.
export function stubMatchMedia(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  const limit = (query: string) => Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? NaN);
  const stub = (query: string) => ({
    media: query,
    get matches() {
      return width <= limit(query);
    },
    addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: stub as unknown as typeof window.matchMedia,
  });
  return {
    resizeTo(next: number) {
      width = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
  };
}
