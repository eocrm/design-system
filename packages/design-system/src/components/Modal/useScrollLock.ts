import { useLayoutEffect } from 'react';

// Module-level state shared across all useScrollLock callers.
let count = 0;
let savedScrollX = 0;
let savedScrollY = 0;
let originalOverflow: string | null = null;
let originalPosition: string | null = null;
let originalTop: string | null = null;
let originalLeft: string | null = null;
let originalWidth: string | null = null;

function lock() {
  if (count === 0) {
    savedScrollY = window.scrollY;
    savedScrollX = window.scrollX;

    originalOverflow = document.body.style.overflow;
    originalPosition = document.body.style.position;
    originalTop = document.body.style.top;
    originalLeft = document.body.style.left;
    originalWidth = document.body.style.width;

    // position: fixed is the iOS-safe scroll lock. It prevents momentum
    // scrolling rubber-banding past the overlay on Safari, which
    // `overflow: hidden` alone does not. Negative top/left offsets keep the
    // visual position unchanged while the body is locked in place.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = `-${savedScrollX}px`;
    document.body.style.width = '100%';
    // overflow: hidden is no longer strictly needed with position: fixed, but
    // we set it defensively for non-iOS browsers where fixed alone may not
    // suppress all scroll paths (e.g. keyboard scrolling on desktop).
    document.body.style.overflow = 'hidden';
  }
  count += 1;
}

function unlock() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    document.body.style.overflow = originalOverflow ?? '';
    document.body.style.position = originalPosition ?? '';
    document.body.style.top = originalTop ?? '';
    document.body.style.left = originalLeft ?? '';
    document.body.style.width = originalWidth ?? '';

    originalOverflow = null;
    originalPosition = null;
    originalTop = null;
    originalLeft = null;
    originalWidth = null;

    // Restore the scroll position that was active when the lock was acquired.
    window.scrollTo(savedScrollX, savedScrollY);
  }
}

/**
 * Body scroll lock. Ref-counted across all callers so nested modals share
 * the same lock — the first acquire suppresses scrolling, the last release
 * restores it.
 *
 * Uses the `position: fixed` body technique rather than `overflow: hidden`
 * alone. On iOS Safari, `overflow: hidden` does not fully suppress momentum
 * scrolling — the user can still rubber-band the body past a `position:fixed`
 * overlay. Pinning `body` to `position: fixed` with `top: -<scrollY>px` and
 * `left: -<scrollX>px` prevents this. Scroll position is saved on lock and
 * restored via `window.scrollTo` on unlock so the page returns exactly where
 * the user left it.
 */
export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
