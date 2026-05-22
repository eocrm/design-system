import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Focus trap: keeps Tab focus cycling inside `containerRef`. Attaches a
 * `keydown` listener to detect Tab at the first/last focusable and wrap, plus
 * a `focusin` listener at document level to redirect any focus that escapes
 * the container back to it.
 *
 * `active = false` no-ops the trap (used by Modal when not top of stack — the
 * inner modal mounts but only the topmost modal owns focus).
 *
 * @example
 * const contentRef = useRef<HTMLDivElement | null>(null);
 * useFocusTrap(contentRef, open);
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables(container!);
      if (focusables.length === 0) {
        // Zero focusables: prevent Tab from escaping the container.
        e.preventDefault();
        container!.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
      // Middle of the cycle: browser handles it natively.
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node | null;
      if (!target || !container) return;
      if (container.contains(target)) return;
      // Focus escaped — redirect to the container.
      container.focus();
    }

    container.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [containerRef, active]);
}
