import { useLayoutEffect, useRef, useState } from 'react';

/** Where a step's target stands. `missing` = timed out; the card falls back to centered. */
export type TourTargetStatus = 'none' | 'waiting' | 'found' | 'missing';

export interface TourTargetState {
  element: HTMLElement | null;
  status: TourTargetStatus;
}

const NONE: TourTargetState = { element: null, status: 'none' };
const WAITING: TourTargetState = { element: null, status: 'waiting' };
const MISSING: TourTargetState = { element: null, status: 'missing' };

const warnedDuplicates = new Set<string>();

function isRendered(el: HTMLElement): boolean {
  return el.isConnected && el.getClientRects().length > 0;
}

/**
 * First RENDERED element whose `data-tour` equals `id` (exact match — no CSS
 * escaping needed). `display:none` / `hidden` matches count as absent.
 */
export function findTourTarget(id: string): HTMLElement | null {
  const matches = Array.from(document.querySelectorAll<HTMLElement>('[data-tour]')).filter(
    (el) => el.dataset.tour === id && isRendered(el),
  );
  if (matches.length > 1 && process.env.NODE_ENV !== 'production' && !warnedDuplicates.has(id)) {
    warnedDuplicates.add(id);
    console.warn(`[Tour] ${matches.length} elements match data-tour="${id}"; using the first.`);
  }
  return matches[0] ?? null;
}

/**
 * Resolves a step's `data-tour` target and keeps it resolved: waits (via a
 * MutationObserver on `body`) for a target that hasn't mounted or is hidden,
 * falls back to `missing` after `timeout` ms (`Infinity` = wait forever), and
 * re-attaches if the node is replaced mid-step (the timeout restarts).
 */
export function useTourTarget(
  target: string | undefined,
  timeout: number,
  onMissing: () => void,
): TourTargetState {
  const [state, setState] = useState<TourTargetState>(NONE);
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  useLayoutEffect(() => {
    if (!target) {
      setState(NONE);
      return;
    }
    let current: HTMLElement | null | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    const check = () => {
      const el = findTourTarget(target);
      if (el === current) return;
      current = el;
      if (el) {
        clearTimeout(timer);
        timer = undefined;
        timedOut = false;
        setState({ element: el, status: 'found' });
        return;
      }
      if (timedOut) {
        setState(MISSING);
        return;
      }
      setState(WAITING);
      if (Number.isFinite(timeout)) {
        timer = setTimeout(() => {
          timedOut = true;
          setState(MISSING);
          onMissingRef.current();
        }, timeout);
      }
    };

    check();
    // `class` / `style` / `hidden` catch targets revealed by an accordion or
    // tab switch. querySelectorAll('[data-tour]') per mutation is cheap.
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tour', 'class', 'style', 'hidden'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [target, timeout]);

  return state;
}
