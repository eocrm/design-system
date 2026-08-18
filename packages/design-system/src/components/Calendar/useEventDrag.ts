import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
} from 'react';
import { startOfDay } from '../../calendar/dateMath';
import type {
  CalendarDropResult,
  CalendarEvent,
  CalendarEventMove,
  CalendarEventResize,
  TimedEventBlock,
} from './types';
import type { HourGridColumnRef } from './utils';

/** Which gesture a drag represents. */
export type DragMode = 'move' | 'resize';

/**
 * The live, uncommitted placement of the block being dragged.
 *
 * `startMinutes` / `endMinutes` are grid coordinates for rendering; `startsAt`
 * / `endsAt` are the projected instants the consumer will be offered. They are
 * computed together so the block's rendered position, its visible time label,
 * and the payload can never disagree.
 */
export interface DragPreview {
  /** `CalendarEvent.id` of the block being dragged. */
  eventId: string;
  mode: DragMode;
  /** Column the block currently hovers over — may differ from where it started. */
  columnIndex: number;
  /** Minutes from `hourRange[0] * 60`, snapped and clamped to the visible window. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`, snapped and clamped to the visible window. */
  endMinutes: number;
  /** Projected start instant — `startsAt` of the proposal. */
  startsAt: Date;
  /** Projected end instant — `endsAt` of the proposal. */
  endsAt: Date;
  /** The placement was refused, by `canDropEvent` mid-drag or by the handler on drop. */
  invalid: boolean;
}

/** Pixels the pointer must travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3;

/**
 * What the grid should announce in its live region. The hook reports the
 * placement and the outcome; the caller owns the wording, because formatting a
 * time is locale work and every user-facing string has to come from i18n.
 */
export interface DragAnnouncement {
  mode: DragMode;
  startsAt: Date;
  endsAt: Date;
  /** The placement was refused — by `canDropEvent`, or by the handler on drop. */
  refused: boolean;
  /** Whether this is the settled outcome of a drop rather than in-flight feedback. */
  committed: boolean;
  /** Monotonic, so an identical message still re-announces. */
  seq: number;
}

export interface UseEventDragArgs {
  /** The grid's columns, in render order. */
  columns: readonly HourGridColumnRef[];
  /** Pixel height of one hour row — the px↔minutes conversion factor. */
  hourRowHeight: number;
  /** Inclusive start, exclusive end of the visible hour range. */
  hourRange: readonly [number, number];
  /** Snap granularity in minutes. Values below 1 are treated as 1. */
  snapMinutes: number;
  /** Live DOM nodes of the day columns, for pointer hit-testing. */
  columnElements: MutableRefObject<(HTMLElement | null)[]>;
  onEventMove?: (event: CalendarEvent, next: CalendarEventMove) => CalendarDropResult;
  onEventResize?: (event: CalendarEvent, next: CalendarEventResize) => CalendarDropResult;
  canDropEvent?: (event: CalendarEvent, next: CalendarEventMove) => boolean;
}

export interface UseEventDragResult {
  /** The in-flight placement, or `null` when nothing is being dragged. */
  preview: DragPreview | null;
  /** Latest thing worth announcing, or `null` before any gesture. */
  announcement: DragAnnouncement | null;
  /** True while a drag gesture owns the pointer. */
  dragging: boolean;
  /** Whether this grid accepts move gestures at all. */
  canMove: boolean;
  /** Whether this grid accepts resize gestures at all. */
  canResize: boolean;
  /** Begin a pointer drag from a `pointerdown` on a block (or its resize handle). */
  startPointerDrag: (block: TimedEventBlock, mode: DragMode, e: PointerEvent) => void;
  /** Keyboard equivalent: nudge a block by whole snap steps and/or whole columns. */
  nudge: (
    block: TimedEventBlock,
    delta: { mode: DragMode; steps: number; columns?: number },
  ) => void;
  /** True when the click that follows the drag we just finished must be swallowed. */
  consumeClickSuppression: () => boolean;
  /** Clear a stale suppression flag at the start of any fresh press. */
  resetClickSuppression: () => void;
}

/** A Date on `day`'s calendar date, at `minutes` past local midnight. */
function dateAtMinutes(day: Date, minutes: number): Date {
  const d = startOfDay(day);
  // Wall-clock arithmetic, and it rolls past 24:00 into the next day — which
  // is what an overnight booking needs.
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/** Round to the nearest multiple of `snap` (always >= 1 so this can't divide by zero). */
function snapTo(minutes: number, snap: number): number {
  return Math.round(minutes / snap) * snap;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The event's own wall-clock duration in minutes.
 *
 * Deliberately read from the `CalendarEvent`, NOT from
 * `block.endMinutes - block.startMinutes`: the layout clips a block that ends
 * on a later day to the bottom of the visible column, so a 20:00→02:00
 * booking's block is only as tall as the grid. Deriving the duration from the
 * block would silently shorten every overnight event that gets dragged.
 */
function eventDurationMinutes(event: CalendarEvent): number {
  const end = event.endsAt ?? event.startsAt;
  return Math.max(0, Math.round((end.getTime() - event.startsAt.getTime()) / 60_000));
}

interface ProjectionConfig {
  columns: readonly HourGridColumnRef[];
  baseMinutes: number;
  visibleMinutes: number;
  snap: number;
}

/**
 * Turn a raw target (in grid minutes) into a fully-resolved preview: snapped,
 * clamped to the visible hour window, and projected to real instants.
 *
 * The clamp is what keeps a drag honest. Without it an upward drag past the
 * top of the grid produces negative minutes, and the projection rolls back
 * into the *previous calendar day* — so the consumer is handed a proposal for
 * a day the pointer never visited, for a slot that isn't rendered.
 */
function project(
  block: TimedEventBlock,
  mode: DragMode,
  columnIndex: number,
  target: number,
  cfg: ProjectionConfig,
): DragPreview {
  const column = cfg.columns[columnIndex] ?? cfg.columns[block.dayIndex];
  const duration = eventDurationMinutes(block.event);

  // Minutes from the grid's first rendered hour to the column day's midnight —
  // the furthest a placement may reach without rolling into another date.
  const dayEndMinutes = 24 * 60 - cfg.baseMinutes;

  if (mode === 'move') {
    // The START is confined to the visible window: that is the only place the
    // pointer can meaningfully aim, and an unclamped upward drag would go
    // negative and project back into the PREVIOUS calendar day — handing the
    // consumer a proposal for a date the pointer never visited.
    //
    // The END is deliberately NOT confined. An overnight booking legitimately
    // ends outside the window, and clamping it would silently shorten the
    // event; the block simply renders clipped at the grid's bottom edge, the
    // same as any event that already runs past `hourRange`.
    const maxStart = Math.max(0, cfg.visibleMinutes - cfg.snap);
    const startMinutes = clamp(snapTo(target, cfg.snap), 0, maxStart);
    return {
      eventId: block.event.id,
      mode,
      columnIndex,
      startMinutes,
      endMinutes: startMinutes + duration,
      startsAt: dateAtMinutes(column.date, cfg.baseMinutes + startMinutes),
      // Projected from the same wall-clock origin, so the proposal's duration
      // matches the event's even when it crosses midnight.
      endsAt: dateAtMinutes(column.date, cfg.baseMinutes + startMinutes + duration),
      invalid: false,
    };
  }

  // Resize: the start is untouched — including when it sits above the visible
  // window (an event that began before `hourRange`). The end may run past the
  // window (a booking that finishes after closing time) but not past the
  // column day's own midnight, which would silently re-date the event.
  const startMinutes = block.startMinutes;
  const minEnd = startMinutes + cfg.snap;
  const endMinutes = clamp(snapTo(target, cfg.snap), minEnd, Math.max(minEnd, dayEndMinutes));
  return {
    eventId: block.event.id,
    mode,
    columnIndex,
    startMinutes,
    endMinutes,
    startsAt: block.event.startsAt,
    endsAt: dateAtMinutes(column.date, cfg.baseMinutes + endMinutes),
    invalid: false,
  };
}

/** Duck-typed thenable check — a consumer may return a non-native promise. */
function isThenable(value: unknown): value is Promise<void | boolean> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Pointer + keyboard drag controller for the hour grid's timed blocks.
 *
 * Hand-rolled on pointer events rather than built on `@dnd-kit`: the gesture
 * is a continuous px→minutes projection onto one shared time axis, not a
 * sortable list reorder, so the sensor/collision machinery would be pure
 * overhead here.
 *
 * The consumer stays the source of truth. A drop is *proposed*, never
 * applied: `canDropEvent` can veto it live during the gesture (the preview
 * renders refused), and `onEventMove` / `onEventResize` can veto it on
 * release. A refused drop is styled as refused and the preview is discarded;
 * an accepted one is also discarded — the block's resting position always
 * comes from `events`, so accepting only matters because the consumer commits
 * the change. Nothing here mutates the event.
 */
export function useEventDrag({
  columns,
  hourRowHeight,
  hourRange,
  snapMinutes,
  columnElements,
  onEventMove,
  onEventResize,
  canDropEvent,
}: UseEventDragArgs): UseEventDragResult {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState<DragAnnouncement | null>(null);
  const seqRef = useRef(0);

  const announce = useCallback((p: DragPreview, refused: boolean, committed: boolean) => {
    seqRef.current += 1;
    setAnnouncement({
      mode: p.mode,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      refused,
      committed,
      seq: seqRef.current,
    });
  }, []);

  const canMove = onEventMove !== undefined;
  const canResize = onEventResize !== undefined;
  const snap = Math.max(1, Math.round(snapMinutes));
  const baseMinutes = hourRange[0] * 60;
  const visibleMinutes = Math.max(0, (hourRange[1] - hourRange[0]) * 60);

  // Mutable gesture bookkeeping. Kept in a ref (not state) so the window
  // listeners below can be registered exactly once per gesture instead of
  // re-subscribing on every pointermove.
  const gestureRef = useRef<{
    token: number;
    block: TimedEventBlock;
    mode: DragMode;
    pointerId: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const suppressClickRef = useRef(false);
  // Monotonic gesture id. A settling async commit from gesture N must not tear
  // down gesture N+1 that the user has already started.
  const tokenRef = useRef(0);

  // Latest props, read by the window listeners without re-subscribing. Synced
  // in an effect rather than assigned during render — a render that React
  // discards must not be able to publish values to a committed listener.
  const latest = useRef({
    columns,
    hourRowHeight,
    baseMinutes,
    visibleMinutes,
    snap,
    canDropEvent,
    columnElements,
  });
  useEffect(() => {
    latest.current = {
      columns,
      hourRowHeight,
      baseMinutes,
      visibleMinutes,
      snap,
      canDropEvent,
      columnElements,
    };
  });

  const setPreviewBoth = useCallback((next: DragPreview | null) => {
    previewRef.current = next;
    setPreview(next);
  }, []);

  const cfg = useCallback(
    (): ProjectionConfig => ({
      columns: latest.current.columns,
      baseMinutes: latest.current.baseMinutes,
      visibleMinutes: latest.current.visibleMinutes,
      snap: latest.current.snap,
    }),
    [],
  );

  const toPayload = useCallback((p: DragPreview): CalendarEventMove => {
    const column = latest.current.columns[p.columnIndex];
    return {
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      resourceId: column?.resourceId ?? undefined,
    };
  }, []);

  const validate = useCallback(
    (p: DragPreview, block: TimedEventBlock): boolean => {
      const check = latest.current.canDropEvent;
      if (!check) return true;
      return check(block.event, toPayload(p));
    },
    [toPayload],
  );

  /** Tear down a gesture — unless a newer one has already taken over. */
  const finish = useCallback(
    (token: number) => {
      if (token !== tokenRef.current) return;
      gestureRef.current = null;
      setDragging(false);
      setPreviewBoth(null);
    },
    [setPreviewBoth],
  );

  const commit = useCallback(
    (p: DragPreview, block: TimedEventBlock, token: number) => {
      // A refused placement never reaches the consumer.
      if (!validate(p, block)) {
        announce(p, true, true);
        finish(token);
        return;
      }
      const payload = toPayload(p);
      const result: CalendarDropResult =
        p.mode === 'move'
          ? onEventMove?.(block.event, payload)
          : onEventResize?.(block.event, { startsAt: payload.startsAt, endsAt: payload.endsAt });

      if (isThenable(result)) {
        // Hold the preview until the consumer's async verdict lands, so an
        // accepted drop doesn't flash back to its old slot while the request
        // is in flight. The gesture itself is over.
        gestureRef.current = null;
        setDragging(false);
        result.then(
          (verdict) => {
            // A refused drop is shown as refused before the preview goes away,
            // so the user sees WHY the block returned to where it started.
            const refused = verdict === false;
            if (refused && token === tokenRef.current && previewRef.current) {
              setPreviewBoth({ ...previewRef.current, invalid: true });
            }
            announce(p, refused, true);
            finish(token);
          },
          () => {
            if (token === tokenRef.current && previewRef.current) {
              setPreviewBoth({ ...previewRef.current, invalid: true });
            }
            announce(p, true, true);
            finish(token);
          },
        );
        return;
      }
      const refused = result === false;
      if (refused && token === tokenRef.current && previewRef.current) {
        setPreviewBoth({ ...previewRef.current, invalid: true });
      }
      announce(p, refused, true);
      finish(token);
    },
    [validate, toPayload, onEventMove, onEventResize, finish, setPreviewBoth, announce],
  );

  const startPointerDrag = useCallback(
    (block: TimedEventBlock, mode: DragMode, e: PointerEvent) => {
      if (mode === 'move' && !canMove) return;
      if (mode === 'resize' && !canResize) return;
      // Primary button only — a right-click must not start a reschedule.
      if (e.button !== 0) return;
      e.stopPropagation();
      suppressClickRef.current = false;
      // A fresh press starts from the event's real position — never from a
      // preview left behind by a previous gesture whose async commit has not
      // settled yet.
      setPreviewBoth(null);
      tokenRef.current += 1;
      gestureRef.current = {
        token: tokenRef.current,
        block,
        mode,
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        moved: false,
      };
      setDragging(true);
    },
    [canMove, canResize, setPreviewBoth],
  );

  // One subscription per gesture. Listening on `window` (rather than relying
  // on pointer capture alone) keeps the drag alive when the pointer leaves
  // the grid — including drops outside it, which simply resolve to the last
  // valid column.
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const dy = e.clientY - g.originY;
      const dx = e.clientX - g.originX;
      if (!g.moved && Math.abs(dy) < DRAG_THRESHOLD_PX && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      g.moved = true;

      const { hourRowHeight: rowH, columns: cols, columnElements: els } = latest.current;
      const rawDelta = (dy / rowH) * 60;

      let columnIndex = previewRef.current?.columnIndex ?? g.block.dayIndex;
      if (g.mode === 'move') {
        // Hit-test the columns horizontally so a drag can cross into another
        // day (week view) or another resource lane (resource day view).
        const hit = els.current.findIndex((el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          // A zero-width rect means the element has no layout to hit-test
          // against; treating that as "no hit" keeps the column stable.
          if (r.width === 0) return false;
          return e.clientX >= r.left && e.clientX < r.right;
        });
        if (hit !== -1) columnIndex = hit;
      }
      if (columnIndex < 0 || columnIndex >= cols.length) columnIndex = g.block.dayIndex;

      const target =
        g.mode === 'move' ? g.block.startMinutes + rawDelta : g.block.endMinutes + rawDelta;
      const next = project(g.block, g.mode, columnIndex, target, cfg());
      next.invalid = !validate(next, g.block);
      const prev = previewRef.current;
      setPreviewBoth(next);
      // Announce only when the proposed slot actually changed — snapping makes
      // that discrete, so this is one message per slot rather than per pixel.
      if (
        !prev ||
        prev.startMinutes !== next.startMinutes ||
        prev.endMinutes !== next.endMinutes ||
        prev.columnIndex !== next.columnIndex ||
        prev.invalid !== next.invalid
      ) {
        announce(next, next.invalid, false);
      }
    };

    const handleUp = (e: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const p = previewRef.current;
      if (!g.moved || !p) {
        // A press that never crossed the threshold is a click, not a drag.
        finish(g.token);
        return;
      }
      // The click event that follows this pointerup would otherwise open the
      // consumer's detail UI — or, if the pointer ended over the column
      // background rather than the block, create a booking at that slot.
      suppressClickRef.current = true;
      commit(p, g.block, g.token);
    };

    const handleCancel = (e: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      // Pointer cancellation (a system gesture taking over, the element being
      // removed) discards the drag without proposing anything.
      finish(g.token);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [dragging, commit, finish, setPreviewBoth, validate, cfg, announce]);

  const nudge = useCallback(
    (block: TimedEventBlock, delta: { mode: DragMode; steps: number; columns?: number }) => {
      if (delta.mode === 'move' && !canMove) return;
      if (delta.mode === 'resize' && !canResize) return;
      const step = latest.current.snap;
      const columnDelta = delta.columns ?? 0;
      const columnIndex = clamp(
        block.dayIndex + columnDelta,
        0,
        Math.max(0, latest.current.columns.length - 1),
      );

      // A pure column change must not also re-snap the time — moving a 09:07
      // booking to the next lane should leave it at 09:07.
      const base = delta.mode === 'move' ? block.startMinutes : block.endMinutes;
      const target = delta.steps === 0 ? base : snapTo(base, step) + delta.steps * step;
      const next = project(block, delta.mode, columnIndex, target, cfg());

      // Nothing actually changed (already at the first/last column, or clamped
      // against the window edge) — don't bother the consumer with a no-op.
      if (
        next.startMinutes === block.startMinutes &&
        next.endMinutes === block.endMinutes &&
        columnIndex === block.dayIndex
      ) {
        return;
      }
      tokenRef.current += 1;
      commit(next, block, tokenRef.current);
    },
    [canMove, canResize, commit, cfg],
  );

  const consumeClickSuppression = useCallback(() => {
    const was = suppressClickRef.current;
    suppressClickRef.current = false;
    return was;
  }, []);

  // A drop released outside the grid produces no click at all, so the flag
  // would otherwise survive to swallow the next genuine one. Every fresh
  // press clears it — including presses that start no gesture (a plain click,
  // or a press on a block in a resize-only grid).
  const resetClickSuppression = useCallback(() => {
    suppressClickRef.current = false;
  }, []);

  return {
    preview,
    announcement,
    dragging,
    canMove,
    canResize,
    startPointerDrag,
    nudge,
    consumeClickSuppression,
    resetClickSuppression,
  };
}
