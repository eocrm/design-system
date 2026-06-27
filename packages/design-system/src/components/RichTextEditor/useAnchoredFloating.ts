// useAnchoredFloating.ts — shared portal-overlay positioning for <RichTextEditor>.
// The link bubble, @-mention listbox, and attachment config popover all anchor a
// Floating UI virtual element to a (live) selection/figure rect — fixed strategy,
// flip + shift, auto-updating on scroll/resize. This collapses that duplicated
// scaffolding into one hook. Internal; NOT exported from the package.
import { useMemo } from 'react';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import type { Rect } from './selection';

/** Expand a `Rect` (top/left/width/height) into the full DOMRect shape Floating UI reads. */
function rectToDomRect(r: Rect): DOMRect {
  return {
    x: r.left,
    y: r.top,
    top: r.top,
    left: r.left,
    right: r.left + r.width,
    bottom: r.top + r.height,
    width: r.width,
    height: r.height,
  } as DOMRect;
}

/**
 * Shared portal-overlay positioning: a Floating UI virtual element anchored to a
 * (live) rect, fixed strategy + flip + shift, auto-updating on scroll/resize.
 * Mirrors the link/mention/attachment overlays' anchoring in one place.
 *
 * `getAnchorRect`, when provided, is re-read on every reposition so the overlay
 * tracks the selection line / figure on scroll (the static `anchorRect` is the
 * fallback for the initial frame / when the live rect is unavailable). `opts.offset`
 * sets the gap between anchor and overlay (defaults to 6).
 */
export function useAnchoredFloating(
  anchorRect: Rect,
  getAnchorRect: (() => Rect | null) | undefined,
  opts: { offset?: number } = {},
) {
  const virtualRef = useMemo(
    () => ({ getBoundingClientRect: () => rectToDomRect(getAnchorRect?.() ?? anchorRect) }),
    [anchorRect, getAnchorRect],
  );
  return useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(opts.offset ?? 6), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });
}
