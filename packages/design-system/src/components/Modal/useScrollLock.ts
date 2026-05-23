import { useLayoutEffect } from 'react';

// Module-level state shared across all useScrollLock callers.
let count = 0;
let originalPosition: string | null = null;
let originalTop: string | null = null;
let originalLeft: string | null = null;
let originalWidth: string | null = null;
let originalPaddingRight: string | null = null;

function lock() {
  if (count === 0) {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    originalPosition = document.body.style.position;
    originalTop = document.body.style.top;
    originalLeft = document.body.style.left;
    originalWidth = document.body.style.width;
    originalPaddingRight = document.body.style.paddingRight;

    // Scrollbar-width compensation: body becomes position:fixed, the html
    // scrollbar disappears, and content would otherwise reflow horizontally
    // into the freed space. Padding on body absorbs that shift.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Fix the body in place at the user's current visual scroll position.
    // top: -<scrollY>px keeps the content visually where it was; the body
    // is now out of flow so no scrolling is possible. This avoids the
    // scroll-to-top jump that `overflow: hidden` causes on the html element
    // (overflow:hidden clamps scrollTop to 0).
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = '100%';
  }
  count += 1;
}

function unlock() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    // Read saved scroll position from the body's top/left offset BEFORE
    // restoring, so we can scroll back to exactly where we were.
    const savedY = -parseFloat(document.body.style.top || '0');
    const savedX = -parseFloat(document.body.style.left || '0');

    document.body.style.position = originalPosition ?? '';
    document.body.style.top = originalTop ?? '';
    document.body.style.left = originalLeft ?? '';
    document.body.style.width = originalWidth ?? '';
    document.body.style.paddingRight = originalPaddingRight ?? '';

    originalPosition = null;
    originalTop = null;
    originalLeft = null;
    originalWidth = null;
    originalPaddingRight = null;

    // Force a synchronous reflow so the document's scrollable height is
    // recalculated from the now-restored body BEFORE we scrollTo. Without
    // this, the browser can clamp scrollTo to maxScrollY = 0 (the height
    // while body was still fixed) and the page jumps to the top.
    void document.body.offsetHeight;

    // `behavior: 'instant'` bypasses any smooth-scroll preference and forces
    // a single-frame jump. Without it, an animated scroll could be
    // interrupted by post-unlock reflow (focus restoration) and land at an
    // intermediate position.
    window.scrollTo({ left: savedX, top: savedY, behavior: 'instant' });

    // Belt-and-braces: re-issue on the next frame in case the synchronous
    // call was clamped because the layout pipeline hadn't yet committed.
    // No-op when the first call already succeeded.
    requestAnimationFrame(() => {
      window.scrollTo({ left: savedX, top: savedY, behavior: 'instant' });
    });
  }
}

/**
 * Body scroll lock. Ref-counted across all callers so nested modals share
 * the same lock — the first acquire suppresses scrolling, the last release
 * restores it.
 *
 * Pins `body` to `position: fixed` with `top: -<scrollY>px` and
 * `left: -<scrollX>px` so the user's visual scroll position is preserved
 * while the body is locked. On unlock, the saved offsets are read back from
 * body's inline styles and `scrollTo` returns the page to where the user
 * left it. `overflow: hidden` on html is intentionally NOT used here
 * because it clamps `scrollTop` to 0 and jumps the page to the top.
 */
export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
