import { useLayoutEffect } from 'react';

// Module-level state shared across all useScrollLock callers.
let count = 0;
let originalHtmlOverflow: string | null = null;
let originalBodyOverflow: string | null = null;
let originalPaddingRight: string | null = null;

function lock() {
  if (count === 0) {
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;

    // Compensate for the disappearing scrollbar so the page doesn't shift
    // horizontally when its scrollbar is removed by overflow:hidden.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Suppress scroll without moving the body. The page stays exactly where
    // it was — no scroll position to save, no scrollTo dance on unlock, no
    // smooth-scroll animation to fight. Setting both html and body covers
    // browsers that route scroll to either element.
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  count += 1;
}

function unlock() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    document.documentElement.style.overflow = originalHtmlOverflow ?? '';
    document.body.style.overflow = originalBodyOverflow ?? '';
    document.body.style.paddingRight = originalPaddingRight ?? '';

    originalHtmlOverflow = null;
    originalBodyOverflow = null;
    originalPaddingRight = null;
  }
}

/**
 * Body scroll lock. Ref-counted across all callers so nested modals share
 * the same lock — the first acquire suppresses scrolling, the last release
 * restores it.
 *
 * Uses `overflow: hidden` on both html and body. The page stays exactly
 * where the user left it (no position change, no scroll-position
 * save/restore). Scrollbar-width compensation on body keeps the content
 * area horizontally stable when the disappearing scrollbar would otherwise
 * cause a layout shift. Pairs with `overscroll-behavior: contain` on the
 * overlay (in Modal.module.scss) to prevent touch-scroll chaining on iOS.
 */
export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
