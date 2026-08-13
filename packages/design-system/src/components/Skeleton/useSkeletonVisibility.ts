import { useLayoutEffect, useRef, useState } from 'react';

/** Timing controls for {@link useSkeletonVisibility}. */
export interface SkeletonVisibilityOptions {
  /**
   * Milliseconds to wait before showing the placeholder. Defaults to `0`.
   * A loading cycle that finishes inside this window never becomes visible.
   */
  delay?: number;

  /**
   * Minimum milliseconds to remain visible after the placeholder appears.
   * Defaults to `0`.
   */
  minDuration?: number;
}

/**
 * Coordinates delayed placeholder visibility and a minimum visible duration.
 * Use the returned boolean to keep placeholder and content branches mutually
 * exclusive while preserving the timing window after `loading` becomes false.
 *
 * @example
 * // Immediate placeholder, then content.
 * const showPlaceholder = useSkeletonVisibility(loading);
 * return showPlaceholder ? <Skeleton width="60%" /> : <ContactList />;
 *
 * @example
 * // Suppress quick-load flashes and avoid flashing content during the delay.
 * const showPlaceholder = useSkeletonVisibility(loading, {
 *   delay: 200,
 *   minDuration: 300,
 * });
 * return showPlaceholder ? <Skeleton width="60%" /> : loading ? null : <ContactList />;
 *
 * @remarks Keep the hook's consumer mounted for the whole loading cycle. If it
 * unmounts as soon as `loading` changes, the minimum-duration tail cannot finish.
 */
export function useSkeletonVisibility(
  loading: boolean,
  options: SkeletonVisibilityOptions = {},
): boolean {
  const normalizedDelay = Math.max(0, options.delay ?? 0);
  const normalizedMinDuration = Math.max(0, options.minDuration ?? 0);
  const [visible, setVisible] = useState(() => loading && normalizedDelay === 0);
  const now = Date.now();
  const shownAt = useRef<number | null>(visible ? now : null);
  const loadingStartedAt = useRef<number | null>(loading ? now : null);
  const wasLoading = useRef(loading);

  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (loading) {
      if (!wasLoading.current || loadingStartedAt.current === null) {
        loadingStartedAt.current = Date.now();
      }
      if (!visible) {
        const show = () => {
          shownAt.current = Date.now();
          setVisible(true);
        };
        const elapsed = Date.now() - loadingStartedAt.current;
        const remaining = Math.max(0, normalizedDelay - elapsed);
        if (remaining === 0) show();
        else timer = setTimeout(show, remaining);
      }
    } else if (visible) {
      const elapsed =
        shownAt.current === null ? normalizedMinDuration : Date.now() - shownAt.current;
      const remaining = Math.max(0, normalizedMinDuration - elapsed);
      const hide = () => {
        shownAt.current = null;
        setVisible(false);
      };
      if (remaining === 0) hide();
      else timer = setTimeout(hide, remaining);
    } else {
      loadingStartedAt.current = null;
    }

    wasLoading.current = loading;

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [loading, normalizedDelay, normalizedMinDuration, visible]);

  return visible;
}
