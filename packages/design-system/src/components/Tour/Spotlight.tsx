import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { autoUpdate } from '@floating-ui/react-dom';
import styles from './Tour.module.scss';

export interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Padded target rect, or a zero-size hole at the viewport center (centered / waiting steps). */
export function holeFor(rect: DOMRect | null, padding: number, vw: number, vh: number): Hole {
  if (!rect) return { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function sameHole(a: Hole, b: Hole): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function measure(target: HTMLElement | null, padding: number): Hole {
  return holeFor(
    target?.getBoundingClientRect() ?? null,
    padding,
    window.innerWidth,
    window.innerHeight,
  );
}

export interface SpotlightProps {
  /** Resolved target; `null` collapses the cutout to the viewport center. */
  target: HTMLElement | null;
  /** Px of cutout around the target. */
  padding: number;
  /** Let pointer events through the cutout to the target. */
  interactive: boolean;
  state: 'open' | 'closed';
  /** Enable geometry transitions (off until the first placement). */
  glide: boolean;
}

/**
 * Modal-mode scrim for `<Tour>` (internal, not exported from the package).
 * A cutout div whose huge box-shadow dims the page, plus four transparent
 * blockers framing it that swallow clicks — box-shadow isn't hit-testable,
 * so the blockers are what actually makes the page non-interactive. The
 * cutout blocks too unless the step is `interactive`.
 */
export function Spotlight({ target, padding, interactive, state, glide }: SpotlightProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hole, setHole] = useState<Hole>(() => measure(target, padding));

  useLayoutEffect(() => {
    const update = () => {
      const next = measure(target, padding);
      setHole((prev) => (sameHole(prev, next) ? prev : next));
    };
    update();
    if (!target || !ref.current) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    // Tracks scroll (any ancestor), resize and layout shift of the target.
    return autoUpdate(target, ref.current, update);
  }, [target, padding]);

  const right = hole.left + hole.width;
  const bottom = hole.top + hole.height;
  const blockers: CSSProperties[] = [
    { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) },
    { top: bottom, left: 0, right: 0, bottom: 0 },
    { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },
    { top: hole.top, left: right, right: 0, height: hole.height },
  ];

  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        data-tour-spotlight=""
        data-state={state}
        data-interactive={interactive ? '' : undefined}
        data-glide={glide ? '' : undefined}
        className={styles.spotlight}
        style={{
          position: 'fixed',
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
        }}
      />
      {blockers.map((b, i) => (
        <div
          key={i}
          aria-hidden="true"
          data-tour-blocker=""
          data-state={state}
          className={styles.blocker}
          style={{ position: 'fixed', ...b }}
        />
      ))}
    </>
  );
}
