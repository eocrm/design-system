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
import { mergeRefs } from '../_internal/refs';
import { FOCUSABLE_SELECTOR } from '../_internal/overlay/useFocusTrap';
import styles from './ScrollArea.module.scss';

/**
 * Height cap for `<ScrollArea>`. A scale value (`'sm' | 'md' | 'lg'`) or an
 * escape-hatch length. Details on `ScrollAreaProps#maxHeight`.
 */
export type ScrollAreaMaxHeight = 'sm' | 'md' | 'lg' | number | string;

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
 * shrinks, so the header stays put while the feed scrolls.
 *
 * Keyboard: while the area overflows AND contains nothing focusable, it
 * becomes a tab stop (`tabIndex=0`, `role="region"`), so keyboard users can
 * scroll it. Name it with `aria-label` / `aria-labelledby`; a dev warning
 * fires if it becomes a tab stop unnamed. With links or buttons inside, it
 * adds no tab stop, because tabbing through them scrolls the area already.
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
 *   <Code>{log}</Code>
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
 * - Horizontal scrolling. ScrollArea scrolls vertically only.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting ScrollAreas. Two scroll containers under one pointer trap the
 *   wheel and make keyboard scrolling ambiguous.
 * - ❌ `className` with `overflow: auto` on a div instead. It loses the
 *   keyboard tab stop, the popover viewport cap, and overscroll containment.
 * - ❌ A ScrollArea with plain-text content and no `aria-label` /
 *   `aria-labelledby`. It becomes an unnamed tab stop.
 * - ❌ Wrapping the ScrollArea more than one level deep inside
 *   `<Popover.Content>`. The viewport cap only reaches a direct child or a
 *   child wrapped once (e.g. `Content > Stack > ScrollArea`).
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { maxHeight, className, style, children, ...rest },
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
    setFocusable(
      el.scrollHeight > el.clientHeight && el.querySelector(FOCUSABLE_SELECTOR) === null,
    );
  }, []);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    // The area's own box changes when its cap or its parent does; its
    // content's height changes when a direct child resizes (images loading,
    // rows expanding). Re-observe children as they're added.
    const observeAll = () => {
      if (!ro) return;
      ro.observe(el);
      for (const child of Array.from(el.children)) ro.observe(child);
    };
    observeAll();
    const mo =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeAll();
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
      role={focusable ? 'region' : undefined}
      className={clsx(styles.root, scale && styles[`max-height-${maxHeight}`], className)}
      style={inlineMaxHeight !== undefined ? { maxHeight: inlineMaxHeight, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = 'ScrollArea';
