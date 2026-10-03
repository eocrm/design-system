import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { chain, mergeRefs } from '../_internal/refs';
import { FOCUSABLE_SELECTOR } from '../_internal/overlay/useFocusTrap';
import styles from './ScrollArea.module.scss';

/**
 * Height cap for `<ScrollArea>`. A scale value (`'sm' | 'md' | 'lg'`) or an
 * escape-hatch length. Details on `ScrollAreaProps#maxHeight`.
 */
// `string & {}` keeps editor autocomplete for the scale values.
export type ScrollAreaMaxHeight = 'sm' | 'md' | 'lg' | number | (string & {});

const SCALE: ReadonlySet<string> = new Set(['sm', 'md', 'lg']);

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Caps the area's height; past it, the content scrolls vertically.
   * - `'sm'` — 240px. A short list inside a form or a card.
   * - `'md'` — 400px. A popover feed (notifications, activity).
   * - `'lg'` — 560px. A tall panel body.
   * - `number` — px, for a one-off (`maxHeight={320}`). Prefer the scale.
   * - `string` — any CSS length (`'50vh'`).
   *
   * Omitted: no cap of its own. The area fills the height its parent gives
   * it, which is right as the flexible child of a bounded flex column.
   */
  maxHeight?: ScrollAreaMaxHeight;
}

/**
 * A region that scrolls only its own content vertically, padded by the focus-ring extent so focused rings are not clipped.
 * @see docs/components/ScrollArea.md
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { maxHeight, className, style, children, onBlur, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [focusable, setFocusable] = useState(false);
  const warnedRef = useRef(false);

  // A scroller the keyboard can't reach is WCAG 2.1.1's failure (axe
  // `scrollable-region-focusable`). Focusable content already reaches it,
  // since tabbing to a child scrolls it into view, so the area only becomes a
  // tab stop when it overflows AND holds nothing focusable. This is what
  // Chrome 130+ and Firefox do natively; Safari doesn't.
  const measure = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const next = el.scrollHeight > el.clientHeight && el.querySelector(FOCUSABLE_SELECTOR) === null;
    // Removing tabIndex from the focused element drops focus to <body>. Keep
    // the tab stop while the area holds focus; the onBlur re-measure drops it.
    setFocusable((prev) => next || (prev && document.activeElement === el));
  }, []);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    // The area's own box changes when its cap or its parent does; its
    // content's height changes when a direct child resizes (images loading,
    // rows expanding). Observe direct children as they're added; drop the
    // ones removed so detached rows aren't held until unmount.
    if (ro) {
      ro.observe(el);
      for (const child of Array.from(el.children)) ro.observe(child);
    }
    const mo =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver((records) => {
            if (ro) {
              for (const record of records) {
                for (const node of Array.from(record.addedNodes)) {
                  if (node instanceof Element && node.parentNode === el) ro.observe(node);
                }
                if (record.target === el) {
                  for (const node of Array.from(record.removedNodes)) {
                    if (node instanceof Element) ro.unobserve(node);
                  }
                }
              }
            }
            measure();
          });
    mo?.observe(el, {
      childList: true,
      subtree: true,
      // A bare text-node child (e.g. a plain-text log) updates via
      // `nodeValue` in place — no childList mutation, so without this the
      // area never re-measures as that text grows.
      characterData: true,
      attributes: true,
      // FOCUSABLE_SELECTOR ignores visibility, so a link inside a `hidden`
      // wrapper still counts as focusable and suppresses the tab stop — a
      // known limit shared with useFocusTrap. `hidden` stays in the filter
      // anyway: the re-measure it triggers is harmless.
      attributeFilter: ['tabindex', 'disabled', 'href', 'hidden'],
    });
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [measure]);

  const named = Boolean(rest['aria-label'] || rest['aria-labelledby']);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (focusable && !named && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        '[ScrollArea] It overflows with no focusable content, so it is a keyboard tab stop — ' +
          'give it an accessible name with aria-label or aria-labelledby.',
      );
    }
  }, [focusable, named]);

  const scale = typeof maxHeight === 'string' && SCALE.has(maxHeight);
  const inlineMaxHeight =
    maxHeight === undefined || scale
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  return (
    // {...rest} last so a consumer tabIndex / role overrides the computed ones.
    <div
      ref={mergeRefs<HTMLDivElement>(innerRef, ref)}
      data-scroll-area=""
      tabIndex={focusable ? 0 : undefined}
      // Named ⇒ always a region: a named generic div is prohibited (ARIA 1.2).
      role={named || focusable ? 'region' : undefined}
      className={clsx(styles.root, scale && styles[`max-height-${maxHeight}`], className)}
      style={inlineMaxHeight !== undefined ? { maxHeight: inlineMaxHeight, ...style } : style}
      onBlur={chain(onBlur, measure)}
      {...rest}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = 'ScrollArea';
