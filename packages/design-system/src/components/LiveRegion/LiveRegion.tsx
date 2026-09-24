import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { VisuallyHidden } from '../VisuallyHidden';

/** How urgently the region interrupts the screen reader. See {@link LiveRegionProps.politeness}. */
export type LiveRegionPoliteness = 'polite' | 'assertive';

export interface LiveRegionProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'role' | 'aria-live' | 'aria-atomic'> {
  /**
   * The message. Pass a string — element children re-announce on every
   * parent render (see `@remarks`). Empty, `null`, or `false` clears the
   * region and announces nothing.
   */
  children?: ReactNode;
  /**
   * How urgently the region interrupts.
   * - `'polite'` (default) — `role="status"` + `aria-live="polite"`. Waits
   *   for the screen reader to finish its current utterance. Use for routine
   *   outcomes: saves, copy confirmations, background updates.
   * - `'assertive'` — `role="alert"` + `aria-live="assertive"`. Interrupts
   *   immediately. Reserve for errors that need immediate attention.
   * @default 'polite'
   */
  politeness?: LiveRegionPoliteness;
  /**
   * Change this (e.g. a counter) to announce the same message again. Without
   * it, re-rendering with identical text is a no-op — screen readers only
   * announce a live region on a text change.
   */
  announceKey?: string | number;
}

const ANNOUNCE_DELAY_MS = 50;

/**
 * A visually-hidden, always-mounted announcement region for screen readers —
 * for consumer-level outcomes that have no visible text of their own (e.g.
 * "Authenticator app added"). Renders `role="status"`/`role="alert"` +
 * `aria-live` on a `VisuallyHidden` span. On mount and on every message
 * change, the region is cleared and then rewritten after a short delay, so
 * the transition from empty → text is what triggers the announcement (Hard
 * rule 10).
 *
 * @example
 * // Two-factor success status
 * <LiveRegion>{addedAuthenticator ? t('security.authenticatorAdded') : null}</LiveRegion>
 *
 * @example
 * // Assertive form-level error
 * <LiveRegion politeness="assertive">{formError}</LiveRegion>
 *
 * @example
 * // Re-announcing an identical message
 * <LiveRegion announceKey={saveCount}>{t('common.saved')}</LiveRegion>
 *
 * @remarks
 * **Anti-patterns:**
 * - ❌ Announcing text that is already visible and focused — the user hears
 *   it twice, once from the region and once from the focused element.
 * - ❌ Mounting it conditionally (`{msg && <LiveRegion>…}`) — keep it always
 *   mounted and pass an empty message instead. It still announces on mount,
 *   but a region that mounts and unmounts per message is unnecessary churn.
 * - ❌ Using it for a library component's own transient state — components
 *   own their own regions (Hard rule 10); `LiveRegion` is for consumer-level
 *   outcomes, not internal component state.
 * - ❌ `assertive` for routine success — reserve it for errors needing
 *   immediate attention.
 * - ❌ Passing JSX children when a string would do — element children
 *   re-announce on every parent render, since their identity changes even
 *   when the rendered text doesn't.
 */
export const LiveRegion = forwardRef<HTMLSpanElement, LiveRegionProps>(function LiveRegion(
  { children, politeness = 'polite', announceKey, ...props },
  ref,
) {
  const [shown, setShown] = useState<ReactNode>(null);
  // Strings / numbers compare by value so a parent re-render with the same
  // text does not re-announce; anything else compares by identity (JSDoc
  // steers consumers to strings).
  const messageKey =
    typeof children === 'string' || typeof children === 'number' ? String(children) : children;
  const latest = useRef(children);
  latest.current = children;

  useEffect(() => {
    // Clear, then write in a later tick: the region goes empty → text, which
    // screen readers treat as a fresh change — that is what makes a mount-
    // with-message and an identical re-announce (announceKey) both fire.
    setShown(null);
    const id = setTimeout(() => setShown(latest.current), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [messageKey, announceKey]);

  // {...props} first so role / aria-live / aria-atomic always win (Pattern B).
  return (
    <VisuallyHidden
      {...props}
      ref={ref}
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
    >
      {shown}
    </VisuallyHidden>
  );
});
