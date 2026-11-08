import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { pastSlop } from '../_internal/longPress';
import type { ChartLayout } from './chartModel';
import { panViewport, zoomViewport, type ChartViewport } from './chartViewport';

/** Wheel zoom: factor = `Math.exp(deltaY * WHEEL_ZOOM_STEP)` (pixel deltas; line deltas ×16). */
export const WHEEL_ZOOM_STEP = 0.0015;
/** Wheel idle time (ms) after which a wheel gesture settles (`end: true`). */
export const WHEEL_END_MS = 200;
/** Two taps closer than this (ms) are a double-tap. */
export const DOUBLE_TAP_MS = 300;
/** …and closer than this (px). */
export const DOUBLE_TAP_SLOP_PX = 24;
const LINE_PX = 16;

/** Pixels dragged across the plot → domain fractions, at the window's span. */
const pxToDomain = (px: number, v: ChartViewport | null, layout: ChartLayout | null) =>
  layout && layout.plot.width > 0 ? (px / layout.plot.width) * (v ? v.to - v.from : 1) : 0;

type Source = 'mouse' | 'touch';

export interface ChartGesturesOptions {
  plotEl: HTMLElement | null;
  layout: ChartLayout | null;
  /** `zoomGestures`: wheel, touch and mouse-drag zoom/pan. */
  enabled: boolean;
  /** Selection owns mouse drags. */
  selectable: boolean;
  viewport: ChartViewport | null;
  /** Categories in the domain. */
  n: number;
  onChange: (next: ChartViewport | null, end: boolean) => void;
  /** Called on a mouse double-click or a touch double-tap; undefined = off. */
  onDoubleClick?: (clientX: number, clientY: number, source: Source) => void;
  /**
   * A touch pan/pinch is about to take over: return false when a lifted long-press selection owns the
   * touch (it wins), else drop any pending press and return true.
   */
  claim: () => boolean;
}

/**
 * Wheel, pinch and pan zoom of the chart viewport, plus double-click/double-tap. Wheel and touch are bound
 * natively (non-passive) on `plotEl`; the returned pointer handlers are composed with the selection's.
 */
export function useChartGestures(o: ChartGesturesOptions) {
  // Listeners are bound once per element; they read the latest render through this ref.
  const latest = useRef(o);
  latest.current = o;

  // One gesture at a time: the window it has reached so far, and whether it moved at all.
  const gesture = useRef<{ at: ChartViewport | null; changed: boolean } | null>(null);
  /** Starts (or joins) a gesture; returns the window it continues from. */
  const begin = () => (gesture.current ??= { at: latest.current.viewport, changed: false }).at;
  const report = (next: ChartViewport | null) => {
    const g = (gesture.current ??= { at: latest.current.viewport, changed: false });
    if (g.at === next || (g.at && next && g.at.from === next.from && g.at.to === next.to)) return;
    g.at = next;
    g.changed = true;
    latest.current.onChange(next, false);
  };
  const settle = () => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.changed) latest.current.onChange(g.at, true);
  };

  const { plotEl, enabled } = o;
  useEffect(() => {
    if (!enabled || !plotEl) return;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    /** Svg x → 0..1 of the visible plot. */
    const anchorAt = (clientX: number) => {
      const { layout } = latest.current;
      if (!layout) return 0.5;
      const x = clientX - plotEl.getBoundingClientRect().left;
      return Math.max(0, Math.min(1, (x - layout.plot.x) / layout.plot.width));
    };
    const toDomain = (px: number, v: ChartViewport | null) =>
      pxToDomain(px, v, latest.current.layout);

    const onWheel = (e: WheelEvent) => {
      const { viewport, n } = latest.current;
      const scale = e.deltaMode === 1 ? LINE_PX : 1;
      const dy = e.deltaY * scale;
      const dx = e.deltaX * scale;
      let next: ChartViewport | null;
      // Ctrl/⌘ + wheel, and trackpad pinch (which browsers send as ctrl + wheel).
      if (e.ctrlKey || e.metaKey) {
        const from = begin();
        next = zoomViewport(from, Math.exp(dy * WHEEL_ZOOM_STEP), anchorAt(e.clientX), n);
      } else if (viewport && (e.shiftKey || Math.abs(dx) > Math.abs(dy))) {
        const from = begin();
        next = panViewport(from, toDomain(e.shiftKey && dx === 0 ? dy : dx, from), n);
      } else {
        return; // A plain vertical wheel always scrolls the page.
      }
      e.preventDefault();
      report(next);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(settle, WHEEL_END_MS);
    };

    // Touch: two fingers pinch (around their midpoint) and pan (by its travel); one finger pans
    // horizontally while zoomed, decided on the dominant axis once past the slop. `from` = window at the
    // (sub)gesture's start, so a pinch never accumulates rounding.
    type Pts = { clientX: number; clientY: number }[];
    let t:
      | { kind: 'one'; x: number; y: number; mode: 'pending' | 'pan' | 'none' }
      | { kind: 'two'; dist: number; mid: number; anchor: number }
      | null = null;
    let from: ChartViewport | null = null;
    const pts = (e: TouchEvent) => Array.from(e.touches as unknown as Pts);
    const spread = ([a, b]: Pts) =>
      Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY));
    const middle = ([a, b]: Pts) => (a.clientX + b.clientX) / 2;

    const onTouchStart = (e: TouchEvent) => {
      const p = pts(e);
      if (p.length >= 2) {
        // A lifted long-press selection keeps the touch.
        if (!latest.current.claim()) {
          t = { kind: 'one', x: 0, y: 0, mode: 'none' };
          return;
        }
        from = begin();
        t = { kind: 'two', dist: spread(p), mid: middle(p), anchor: anchorAt(middle(p)) };
      } else if (p.length === 1 && !t) {
        t = { kind: 'one', x: p[0].clientX, y: p[0].clientY, mode: 'pending' };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const p = pts(e);
      const { n, viewport } = latest.current;
      if (t?.kind === 'two' && p.length >= 2) {
        e.preventDefault();
        const zoomed = zoomViewport(from, t.dist / spread(p), t.anchor, n);
        report(panViewport(zoomed, -toDomain(middle(p) - t.mid, zoomed), n) ?? zoomed);
      } else if (t?.kind === 'one' && p.length === 1) {
        const dx = p[0].clientX - t.x;
        const dy = p[0].clientY - t.y;
        if (t.mode === 'pending' && pastSlop(dx, dy)) {
          const horizontal = Math.abs(dx) > Math.abs(dy) && viewport !== null;
          t.mode = horizontal && latest.current.claim() ? 'pan' : 'none';
          if (t.mode === 'pan') from = begin();
        }
        if (t.mode === 'pan') {
          e.preventDefault();
          report(panViewport(from, -toDomain(dx, from), n));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // A finger lifted mid-pinch: wait for the last one; the remaining finger does not start a pan.
      if (pts(e).length > 0) {
        t = { kind: 'one', x: 0, y: 0, mode: 'none' };
        return;
      }
      t = null;
      settle();
    };

    plotEl.addEventListener('wheel', onWheel, { passive: false });
    plotEl.addEventListener('touchstart', onTouchStart, { passive: false });
    plotEl.addEventListener('touchmove', onTouchMove, { passive: false });
    plotEl.addEventListener('touchend', onTouchEnd);
    plotEl.addEventListener('touchcancel', onTouchEnd);
    return () => {
      clearTimeout(wheelTimer);
      plotEl.removeEventListener('wheel', onWheel);
      plotEl.removeEventListener('touchstart', onTouchStart);
      plotEl.removeEventListener('touchmove', onTouchMove);
      plotEl.removeEventListener('touchend', onTouchEnd);
      plotEl.removeEventListener('touchcancel', onTouchEnd);
      gesture.current = null;
    };
  }, [plotEl, enabled]);

  // Mouse/pen drag pan (zoomed, selection off) and touch double-tap.
  const drag = useRef<{
    id: number;
    x: number;
    base: ChartViewport | null;
    panning: boolean;
  } | null>(null);
  const tap = useRef<{ x: number; y: number; time: number; down?: { x: number; y: number } }>({
    x: 0,
    y: 0,
    time: -Infinity,
  });
  const lastPointer = useRef<string>('mouse');

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    lastPointer.current = e.pointerType;
    if (e.pointerType === 'touch') tap.current.down = { x: e.clientX, y: e.clientY };
    const { enabled: on, selectable, viewport } = latest.current;
    if (on && !selectable && viewport && e.pointerType !== 'touch' && e.button === 0) {
      drag.current = { id: e.pointerId, x: e.clientX, base: viewport, panning: false };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.panning && pastSlop(dx, 0)) {
      d.panning = true;
      d.base = begin();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (d.panning)
      report(panViewport(d.base, -pxToDomain(dx, d.base, latest.current.layout), latest.current.n));
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      drag.current = null;
      if (d.panning) settle();
    }
    const down = tap.current.down;
    tap.current.down = undefined;
    const fire = latest.current.onDoubleClick;
    if (e.pointerType !== 'touch' || !down || !fire || e.type !== 'pointerup') return;
    if (pastSlop(e.clientX - down.x, e.clientY - down.y)) return; // a swipe, not a tap
    const now = Date.now();
    const prev = tap.current;
    if (
      now - prev.time < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_SLOP_PX
    ) {
      tap.current = { x: 0, y: 0, time: -Infinity };
      fire(e.clientX, e.clientY, 'touch');
    } else {
      tap.current = { x: e.clientX, y: e.clientY, time: now };
    }
  };

  // A double-tap may also be followed by a synthesized dblclick; it was reported already.
  const onDoubleClick = (e: MouseEvent<HTMLElement>) => {
    if (lastPointer.current !== 'touch')
      latest.current.onDoubleClick?.(e.clientX, e.clientY, 'mouse');
  };

  return { onPointerDown, onPointerMove, onPointerUp, onDoubleClick };
}
