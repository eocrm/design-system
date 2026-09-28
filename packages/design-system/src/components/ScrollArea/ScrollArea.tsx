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
 * A region that scrolls only its own content vertically: a feed under a
 * fixed header, a long list in a popover. Inside `<Popover.Content>` it is
 * also what lets the popover cap itself at the viewport: the popover
 * becomes a flex column in which the ScrollArea is the only child that
 * shrinks, so the header stays put while the feed scrolls. That needs the
 * ScrollArea to be a direct child of `<Popover.Content>`, or inside one
 * wrapper element that is a direct child. That one wrapper must lay its
 * children out as a column: a `<Stack>`, or a plain element (div/form/Card),
 * which the popover lays out as a column. A row wrapper such as `<Cluster>`
 * is not supported (the popover caps but the feed overflows it) — put the
 * ScrollArea in a Stack instead. Deeper nesting leaves the popover uncapped.
 *
 * Keyboard: name it with `aria-label` / `aria-labelledby` and it is always a
 * `role="region"` landmark. It is a tab stop (`tabIndex=0`) only while it
 * overflows AND contains nothing focusable, so keyboard users can scroll it;
 * a dev warning fires if it becomes a tab stop unnamed (then it is also a
 * region). With links or buttons inside, it adds no tab stop, because
 * tabbing through them scrolls the area already.
 *
 * @example
 * // A notification centre: a fixed header over a scrolling feed.
 * <Popover>
 *   <Popover.Trigger>
 *     <Button variant="ghost" iconOnly aria-label="Notifications"><Bell size={16} /></Button>
 *   </Popover.Trigger>
 *   <Popover.Content minWidth={380}>
 *     <Stack gap="sm">
 *       <Cluster justify="between" align="center">
 *         <Popover.Heading>Notifications</Popover.Heading>
 *         <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all as read</Button>
 *       </Cluster>
 *       <ScrollArea maxHeight="md" aria-label="Notifications">
 *         <Stack gap="xs">{rows}</Stack>
 *       </ScrollArea>
 *     </Stack>
 *   </Popover.Content>
 * </Popover>
 *
 * @example
 * // A plain-text log: overflowing with nothing focusable, so it becomes a
 * // named tab stop by itself.
 * <ScrollArea maxHeight="sm" aria-label="Import log">
 *   <Stack gap="xs">{lines.map((line, i) => <Text key={i} size="sm">{line}</Text>)}</Stack>
 * </ScrollArea>
 *
 * @example
 * // One-off height — prefer the scale.
 * <ScrollArea maxHeight={320} aria-label="Members">{members}</ScrollArea>
 *
 * @remarks When NOT to use
 * - Whole-page scrolling. `AppLayout` owns the page's scroll container.
 * - A Card with a fixed header over a scrolling body. Use `<Card fill>` with
 *   `<Card.Body scroll>`.
 * - Horizontal scrolling. ScrollArea scrolls vertically only: content wider
 *   than the area is clipped (`overflow-x: hidden`), so wrap long lines.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting ScrollAreas. Two scroll containers under one pointer trap the
 *   wheel and make keyboard scrolling ambiguous.
 * - ❌ `className` with `overflow: auto` on a div instead. It loses the
 *   keyboard tab stop, the popover viewport cap, and overscroll containment.
 * - ❌ A ScrollArea with plain-text content and no `aria-label` /
 *   `aria-labelledby`. It becomes an unnamed tab stop.
 * - ❌ Nesting the ScrollArea deeper inside `<Popover.Content>` than a direct
 *   child, or inside one wrapper element that is a direct child
 *   (`Content > Stack > ScrollArea`). Deeper nesting leaves the popover
 *   uncapped.
 * - ❌ A `<Cluster>` (row) as the wrapper around a ScrollArea inside
 *   `<Popover.Content>`. The popover caps but the feed overflows it; put the
 *   ScrollArea in a `<Stack>` instead.
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
