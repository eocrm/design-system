import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { DashboardCanvasValue } from './engine';

/**
 * Fallback row unit when `grid-auto-rows` doesn't resolve to a px length
 * (jsdom, where the square-cell `cqw` calc in `--dashboard-canvas-row` never
 * evaluates). Mirrors `--dashboard-canvas-row-stacked` (`--space-12`, 48px).
 */
export const FALLBACK_ROW_PX = 48;

/** Live px geometry of one container grid, re-measured per pointermove. */
export function measureGrid(el: HTMLElement, columns: number) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const gap = Number.parseFloat(style.columnGap) || 0;
  const rowHeight = Number.parseFloat(style.gridAutoRows) || FALLBACK_ROW_PX;
  const colWidth = (rect.width - gap * (columns - 1)) / columns;
  return { rect, colWidth, rowHeight, gap };
}

type Id = string | number;

/** Absorbs float error (fractional `cqw` rows) so an exact fit never gains a row. */
const FIT_EPSILON = 1e-3;

interface AutoHeightsArgs {
  rootRef: RefObject<HTMLElement | null>;
  value: DashboardCanvasValue;
  isAuto: (id: Id) => boolean;
  /** Applies the item's `minH`/`maxH` to a raw content span. */
  clampSpan: (id: Id, span: number) => number;
  /** A gesture is in flight: passes queue and flush once it ends. */
  frozen: boolean;
  /** Single-column stack: spans don't apply, so nothing is measured. */
  stacked: boolean;
  /** Items in collapsed sections keep their last span. */
  collapsedIds: ReadonlySet<Id>;
  columns: number;
}

/**
 * Measured row spans of `autoHeight` items, by id. One batched pass per
 * animation frame reads every auto body (`[data-dc-auto-body]`, its id from
 * the closest `[data-dc-item]`) with the stretch turned off
 * (`data-dc-measuring` on the root), and sets state only when a span changed.
 * Never measures without `ResizeObserver` (SSR/jsdom): the value's `h` stands.
 */
export function useAutoHeights({
  rootRef,
  value,
  isAuto,
  clampSpan,
  frozen,
  stacked,
  collapsedIds,
  columns,
}: AutoHeightsArgs): ReadonlyMap<Id, number> {
  const [measured, setMeasured] = useState<ReadonlyMap<Id, number>>(() => new Map());

  const autoIds: Id[] = [];
  for (const items of [value.items, ...value.sections.map((section) => section.items)]) {
    for (const p of items) if (isAuto(p.id)) autoIds.push(p.id);
  }
  const autoKey = autoIds.map(String).join('\u0000');
  const collapsedKey = [...collapsedIds].map(String).join('\u0000');

  // The pass runs from observer callbacks; it reads the latest render's inputs.
  const snapshot = { autoIds, clampSpan, frozen, stacked, collapsedIds, columns, measured };
  const latest = useRef(snapshot);
  // Declared before the effects below, so they (and any pass) see this render.
  useEffect(() => {
    latest.current = snapshot;
  });
  const pendingRef = useRef(false);
  const scheduleRef = useRef<(() => void) | null>(null);
  const observedRef = useRef<Element[]>([]);
  const observersRef = useRef<{ ro: ResizeObserver; mo: MutationObserver | null } | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    let raf: number | null = null;
    const pass = () => {
      raf = null;
      const s = latest.current;
      const root = rootRef.current;
      if (!root) return;
      if (s.frozen || s.stacked) {
        pendingRef.current = true;
        return;
      }
      pendingRef.current = false;
      const byKey = new Map(s.autoIds.map((id) => [String(id), id]));
      const reads: Array<{ id: Id; px: number; grid: HTMLElement }> = [];
      const grids = new Map<HTMLElement, { rowHeight: number; gap: number }>();
      // Synchronous set → read → remove: one forced layout for the batch, and
      // neither ResizeObserver nor paint ever sees the unstretched state.
      root.setAttribute('data-dc-measuring', '');
      for (const body of root.querySelectorAll('[data-dc-auto-body]')) {
        const id = byKey.get(body.closest('[data-dc-item]')?.getAttribute('data-dc-item') ?? '');
        const grid = body.closest<HTMLElement>('[data-dc-container]');
        if (id === undefined || !grid || s.collapsedIds.has(id)) continue;
        reads.push({ id, px: body.getBoundingClientRect().height, grid });
        if (!grids.has(grid)) grids.set(grid, measureGrid(grid, s.columns));
      }
      root.removeAttribute('data-dc-measuring');
      let next: Map<Id, number> | null = null;
      for (const { id, px, grid } of reads) {
        const { rowHeight, gap } = grids.get(grid)!;
        const span = s.clampSpan(id, Math.ceil((px + gap) / (rowHeight + gap) - FIT_EPSILON));
        if (s.measured.get(id) === span) continue;
        next ??= new Map(s.measured);
        next.set(id, span);
      }
      if (next) setMeasured(next);
    };
    const schedule = () => {
      raf ??= requestAnimationFrame(pass);
    };
    scheduleRef.current = schedule;
    observersRef.current = {
      ro: new ResizeObserver(schedule),
      mo: typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule),
    };
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      observersRef.current?.ro.disconnect();
      observersRef.current?.mo?.disconnect();
      observersRef.current = null;
      observedRef.current = [];
      scheduleRef.current = null;
    };
  }, [rootRef]);

  // Re-bind whenever the mounted auto bodies change (ids added/removed, or a
  // cell remounted by a cross-container move); a fresh bind measures once.
  useEffect(() => {
    const observers = observersRef.current;
    const root = rootRef.current;
    if (!observers || !root) return;
    const bodies = Array.from(root.querySelectorAll('[data-dc-auto-body]'));
    const prev = observedRef.current;
    if (bodies.length === prev.length && bodies.every((el, i) => el === prev[i])) return;
    observers.ro.disconnect();
    observers.mo?.disconnect();
    for (const body of bodies) {
      observers.ro.observe(body);
      observers.mo?.observe(body, {
        childList: true,
        characterData: true,
        attributes: true,
        subtree: true,
      });
    }
    observedRef.current = bodies;
    scheduleRef.current?.();
  });

  // Column count, stacking or collapse changes re-measure.
  useEffect(() => {
    scheduleRef.current?.();
  }, [columns, stacked, collapsedKey]);

  // A pass queued during a gesture flushes once it ends (after its commit).
  useEffect(() => {
    if (!frozen && pendingRef.current) scheduleRef.current?.();
  }, [frozen]);

  // Only spans of ids that are auto right now; a stale span would override `h`.
  return useMemo(() => {
    const out = new Map<Id, number>();
    for (const id of autoIds) {
      const span = measured.get(id);
      if (span !== undefined) out.set(id, span);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoKey is autoIds' identity
  }, [measured, autoKey]);
}
