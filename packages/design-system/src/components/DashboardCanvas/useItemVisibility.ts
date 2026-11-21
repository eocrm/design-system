import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

type Id = string | number;

/**
 * Live per-item visibility for `renderItem`'s `visible`: one shared
 * `IntersectionObserver` (one viewport of margin above and below) over every
 * `[data-dc-item]` cell under the root, keyed by the cell's id (ids are unique
 * canvas-wide). Items in `collapsedIds` are never visible. Before the first
 * observer callback for an id it is `false`; without `IntersectionObserver`
 * (SSR/jsdom) only collapse decides.
 */
export function useItemVisibility(
  rootRef: RefObject<HTMLElement | null>,
  collapsedIds: ReadonlySet<Id>,
): (id: Id) => boolean {
  const [intersecting, setIntersecting] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const ioRef = useRef<IntersectionObserver | null>(null);
  const observedRef = useRef<Element[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        // One state update per callback; same reference when nothing changed.
        setIntersecting((prev) => {
          let next: Map<string, boolean> | null = null;
          for (const entry of entries) {
            const key = entry.target.getAttribute('data-dc-item');
            if (key == null || prev.get(key) === entry.isIntersecting) continue;
            next ??= new Map(prev);
            next.set(key, entry.isIntersecting);
          }
          return next ?? prev;
        });
      },
      { rootMargin: '100% 0px' },
    );
    ioRef.current = io;
    return () => {
      io.disconnect();
      ioRef.current = null;
      observedRef.current = [];
    };
  }, []);

  // Re-bind whenever the mounted cells change (ids added/removed, or a cell
  // remounted by a cross-container move); observing reports each cell afresh.
  useEffect(() => {
    const io = ioRef.current;
    const root = rootRef.current;
    if (!io || !root) return;
    const cells = Array.from(root.querySelectorAll('[data-dc-item]'));
    const prev = observedRef.current;
    if (cells.length === prev.length && cells.every((el, i) => el === prev[i])) return;
    io.disconnect();
    for (const cell of cells) io.observe(cell);
    observedRef.current = cells;
  });

  const hasIO = typeof IntersectionObserver !== 'undefined';
  return (id) => !collapsedIds.has(id) && (!hasIO || (intersecting.get(String(id)) ?? false));
}
