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
 * The live, uncommitted placement of the block being dragged. Rendered by
 * `TimedEvent` in place of the block's own `startMinutes` / `endMinutes` so
 * the user sees where the event will land before releasing.
 */
export interface DragPreview {
  /** `CalendarEvent.id` of the block being dragged. */
  eventId: string;
  mode: DragMode;
  /** Column the block currently hovers over — may differ from where it started. */
  columnIndex: number;
  /** Minutes from `hourRange[0] * 60`, snapped. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`, snapped. */
  endMinutes: number;
  /** `canDropEvent` rejected this placement — styled as a refused drop. */
  invalid: boolean;
}

/** Pixels the pointer must travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3;

export interface UseEventDragArgs {
  /** The grid's columns, in render order. */
  columns: readonly HourGridColumnRef[];
  /** Pixel height of one hour row — the px↔minutes conversion factor. */
  hourRowHeight: number;
  /** Inclusive start, exclusive end of the visible hour range. */
  hourRange: readonly [number, number];
  /** Snap granularity in minutes. */
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
}

/** A Date on `day`'s calendar date, at `minutes` past local midnight. */
function dateAtMinutes(day: Date, minutes: number): Date {
  const d = startOfDay(day);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/** Round to the nearest multiple of `snap` (always >= 1 so this can't divide by zero). */
function snapTo(minutes: number, snap: number): number {
  return Math.round(minutes / snap) * snap;
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
 * release by returning `false`, or a promise that resolves `false` or
 * rejects — in which case the preview is discarded and the block snaps back
 * to the placement its `events` entry still describes. Accepting likewise
 * only discards the preview; the block moves when (and only when) the
 * consumer commits the change to `events`.
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

  const canMove = onEventMove !== undefined;
  const canResize = onEventResize !== undefined;
  const snap = Math.max(1, Math.round(snapMinutes));
  const baseMinutes = hourRange[0] * 60;

  // Mutable gesture bookkeeping. Kept in a ref (not state) so the window
  // listeners below can be registered exactly once per gesture instead of
  // re-subscribing on every pointermove.
  const gestureRef = useRef<{
    block: TimedEventBlock;
    mode: DragMode;
    pointerId: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const suppressClickRef = useRef(false);

  // Latest props, read by the window listeners without re-subscribing.
  const latest = useRef({
    columns,
    hourRowHeight,
    baseMinutes,
    snap,
    canDropEvent,
    columnElements,
  });
  latest.current = { columns, hourRowHeight, baseMinutes, snap, canDropEvent, columnElements };

  const setPreviewBoth = useCallback((next: DragPreview | null) => {
    previewRef.current = next;
    setPreview(next);
  }, []);

  /**
   * Project a proposed placement into the `CalendarEventMove` /
   * `CalendarEventResize` payload the consumer sees. Resizes keep the
   * original start; moves adopt the target column's date and resource.
   */
  const toPayload = useCallback((p: DragPreview, block: TimedEventBlock) => {
    const column = latest.current.columns[p.columnIndex] ?? latest.current.columns[block.dayIndex];
    const base = latest.current.baseMinutes;
    return {
      startsAt:
        p.mode === 'resize'
          ? block.event.startsAt
          : dateAtMinutes(column.date, base + p.startMinutes),
      endsAt: dateAtMinutes(column.date, base + p.endMinutes),
      resourceId: column.resourceId ?? undefined,
    };
  }, []);

  const validate = useCallback(
    (p: DragPreview, block: TimedEventBlock): boolean => {
      const check = latest.current.canDropEvent;
      if (!check) return true;
      return check(block.event, toPayload(p, block));
    },
    [toPayload],
  );

  const finish = useCallback(() => {
    gestureRef.current = null;
    setDragging(false);
    setPreviewBoth(null);
  }, [setPreviewBoth]);

  const commit = useCallback(
    (p: DragPreview, block: TimedEventBlock) => {
      // A refused placement never reaches the consumer.
      if (!validate(p, block)) {
        finish();
        return;
      }
      const payload = toPayload(p, block);
      const result: CalendarDropResult =
        p.mode === 'move'
          ? onEventMove?.(block.event, payload)
          : onEventResize?.(block.event, { startsAt: payload.startsAt, endsAt: payload.endsAt });

      if (result instanceof Promise) {
        // Hold the preview until the consumer's async verdict lands, so an
        // accepted drop doesn't flash back to its old slot while the request
        // is in flight. Either verdict then drops the preview: `events` is
        // the source of truth for where the block belongs afterwards.
        gestureRef.current = null;
        setDragging(false);
        result.then(finish, finish);
        return;
      }
      finish();
    },
    [validate, toPayload, onEventMove, onEventResize, finish],
  );

  const startPointerDrag = useCallback(
    (block: TimedEventBlock, mode: DragMode, e: PointerEvent) => {
      if (mode === 'move' && !canMove) return;
      if (mode === 'resize' && !canResize) return;
      // Primary button only — a right-click must not start a reschedule.
      if (e.button !== 0) return;
      e.stopPropagation();
      suppressClickRef.current = false;
      gestureRef.current = {
        block,
        mode,
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        moved: false,
      };
      setDragging(true);
    },
    [canMove, canResize],
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

      const {
        hourRowHeight: rowH,
        snap: step,
        columns: cols,
        columnElements: els,
      } = latest.current;
      const rawDelta = (dy / rowH) * 60;

      let columnIndex = previewRef.current?.columnIndex ?? g.block.dayIndex;
      if (g.mode === 'move') {
        // Hit-test the columns horizontally so a drag can cross into another
        // day (week view) or another resource lane (resource day view).
        const hit = els.current.findIndex((el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          // jsdom reports a zero-size rect for every element; treating that
          // as "no hit" keeps the column stable instead of snapping to 0.
          if (r.width === 0) return false;
          return e.clientX >= r.left && e.clientX < r.right;
        });
        if (hit !== -1) columnIndex = hit;
      }
      if (columnIndex < 0 || columnIndex >= cols.length) columnIndex = g.block.dayIndex;

      const duration = g.block.endMinutes - g.block.startMinutes;
      let startMinutes = g.block.startMinutes;
      let endMinutes = g.block.endMinutes;
      if (g.mode === 'move') {
        startMinutes = snapTo(g.block.startMinutes + rawDelta, step);
        endMinutes = startMinutes + duration;
      } else {
        endMinutes = Math.max(startMinutes + step, snapTo(g.block.endMinutes + rawDelta, step));
      }

      const next: DragPreview = {
        eventId: g.block.event.id,
        mode: g.mode,
        columnIndex,
        startMinutes,
        endMinutes,
        invalid: false,
      };
      next.invalid = !validate(next, g.block);
      setPreviewBoth(next);
    };

    const handleUp = (e: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      const p = previewRef.current;
      if (!g.moved || !p) {
        // A press that never crossed the threshold is a click, not a drag.
        finish();
        return;
      }
      // The click event that follows this pointerup would otherwise open the
      // consumer's detail UI for an event the user was only rescheduling.
      suppressClickRef.current = true;
      commit(p, g.block);
    };

    const handleCancel = () => {
      // Pointer cancellation (a system gesture taking over, the element being
      // removed) discards the drag without proposing anything.
      finish();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [dragging, commit, finish, setPreviewBoth, validate]);

  const nudge = useCallback(
    (block: TimedEventBlock, delta: { mode: DragMode; steps: number; columns?: number }) => {
      if (delta.mode === 'move' && !canMove) return;
      if (delta.mode === 'resize' && !canResize) return;
      const step = latest.current.snap;
      const columnDelta = delta.columns ?? 0;
      const columnIndex = Math.min(
        Math.max(block.dayIndex + columnDelta, 0),
        latest.current.columns.length - 1,
      );
      const duration = block.endMinutes - block.startMinutes;

      let startMinutes = block.startMinutes;
      let endMinutes = block.endMinutes;
      if (delta.mode === 'move') {
        startMinutes = snapTo(block.startMinutes + delta.steps * step, step);
        endMinutes = startMinutes + duration;
      } else {
        endMinutes = Math.max(
          startMinutes + step,
          snapTo(block.endMinutes + delta.steps * step, step),
        );
      }
      // Nothing actually changed (already at the first/last column) — don't
      // bother the consumer with a no-op proposal.
      if (
        startMinutes === block.startMinutes &&
        endMinutes === block.endMinutes &&
        columnIndex === block.dayIndex
      ) {
        return;
      }
      commit(
        {
          eventId: block.event.id,
          mode: delta.mode,
          columnIndex,
          startMinutes,
          endMinutes,
          invalid: false,
        },
        block,
      );
    },
    [canMove, canResize, commit],
  );

  const consumeClickSuppression = useCallback(() => {
    const was = suppressClickRef.current;
    suppressClickRef.current = false;
    return was;
  }, []);

  return {
    preview,
    dragging,
    canMove,
    canResize,
    startPointerDrag,
    nudge,
    consumeClickSuppression,
  };
}
