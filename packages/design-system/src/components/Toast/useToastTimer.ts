import { useEffect, useRef } from 'react';

interface UseToastTimerArgs {
  /** Toast id — used purely as a stable dependency key. */
  id: string;
  /** ms or 'persistent'. Persistent skips the timer entirely. */
  duration: number | 'persistent';
  /** Whether the timer is currently paused (hover / focus / hidden tab). */
  paused: boolean;
  /** Called when the timer expires. */
  onExpire: () => void;
  /** Indirection so tests can mock visibility without poking jsdom internals.
   *  Defaults to `document.visibilityState === 'visible'`. */
  getVisible?: () => boolean;
}

/** Manages a per-toast dismiss timer with pause/resume math.
 *
 *  Behavior:
 *  - duration === 'persistent': no timer ever runs.
 *  - paused flips true: capture remaining ms, clear timeout.
 *  - paused flips false (and document visible): re-arm with remaining ms.
 *  - document becomes hidden: behaves like paused = true (auto).
 *  - document becomes visible: behaves like paused = false (auto).
 *  - On unmount: clear timeout, remove visibility listener.
 */
export function useToastTimer({
  id,
  duration,
  paused,
  onExpire,
  getVisible = defaultGetVisible,
}: UseToastTimerArgs): void {
  const remainingRef = useRef<number>(typeof duration === 'number' ? duration : Infinity);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Track document visibility imperatively so we don't trigger React rerenders
  // for tab focus changes.
  const docHiddenRef = useRef(!getVisible());

  useEffect(() => {
    if (duration === 'persistent') return;
    remainingRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (duration === 'persistent') return;

    const tick = () => {
      onExpireRef.current();
    };

    const arm = () => {
      if (timeoutRef.current !== null) return;
      startedAtRef.current = Date.now();
      timeoutRef.current = setTimeout(tick, remainingRef.current);
    };

    const disarm = () => {
      if (timeoutRef.current === null) return;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const elapsed = Date.now() - startedAtRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };

    const sync = () => {
      const shouldRun = !paused && !docHiddenRef.current;
      if (shouldRun) arm();
      else disarm();
    };

    const onVisibilityChange = () => {
      docHiddenRef.current = !getVisible();
      sync();
    };

    sync();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disarm();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, duration, paused]);
}

function defaultGetVisible(): boolean {
  return typeof document === 'undefined' ? true : document.visibilityState === 'visible';
}
