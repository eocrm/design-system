import { useLayoutEffect } from 'react';

// Module-level state shared across all useScrollLock callers.
let count = 0;
let originalOverflow: string | null = null;
let originalPaddingRight: string | null = null;

function lock() {
  if (count === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    // Compensate for the disappearing scrollbar to avoid horizontal layout shift.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  count += 1;
}

function unlock() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    document.body.style.overflow = originalOverflow ?? '';
    document.body.style.paddingRight = originalPaddingRight ?? '';
    originalOverflow = null;
    originalPaddingRight = null;
  }
}

/**
 * Body scroll lock. Ref-counted across all callers so nested modals share
 * the same lock — the first acquire suppresses scrolling, the last release
 * restores it. The original `overflow` value is captured on first acquire
 * and restored on final release (so non-default values are preserved).
 */
export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
