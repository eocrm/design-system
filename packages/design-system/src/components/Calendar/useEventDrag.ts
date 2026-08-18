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
  CalendarDropCandidate,
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
  /** Minutes from `hourRange[0] * 60`. May sit outside the visible window (see `project`). */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`. May sit outside the visible window (see `project`). */
  endMinutes: number;
  /** Projected start instant — `startsAt` of the proposal. */
  startsAt: Date;
  /** Projected end instant — `endsAt` of the proposal. */
  endsAt: Date;
  /** `canDropEvent` refused this placement — styled as a refused drop while the pointer rests on it. */
  invalid: boolean;
  /** The bounds moved the requested value — the gesture asked to go further than it may. */
  clamped: boolean;
}

/** Pixels the pointer must travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3;

/**
 * What the grid should announce in its live region. The hook reports the
 * placement and the outcome; the caller owns the wording, because formatting a
 * time is locale work and every user-facing string has to come from i18n.
 */
export interface DragAnnouncement {
  /** The event being dragged — every message names it, as the rest of the library's drag a11y does. */
  event: CalendarEvent;
  mode: DragMode;
  startsAt: Date;
  endsAt: Date;
  /** The placement was refused — by `canDropEvent` mid-drag, or by the handler on drop. */
  refused: boolean;
  /** The gesture asked to go further than the grid allows, so nothing changed. */
  atEdge: boolean;
  /** The gesture ended exactly where it started — nothing refused it, it simply moved nothing. */
  unchanged: boolean;
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
  canDropEvent?: (event: CalendarEvent, next: CalendarDropCandidate) => boolean;
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

/**
 * The gesture's semantic starting point, captured once when it begins.
 *
 * This exists to keep `TimedEventBlock` out of the projection entirely. A
 * block carries *render* coordinates: `endMinutes` is clipped to the bottom of
 * the column for anything ending on a later day (`layoutEventsForHourGrid`),
 * and reading it for a semantic decision is what produced every drag bug this
 * component has had — a truncated overnight booking, a reversed gesture, a
 * no-op guard that could never match. The frame is derived from the
 * `CalendarEvent`, so clipping cannot leak into a proposal.
 *
 * Invariant for everything below: the controller reads `frame`, never `block`.
 */
interface DragFrame {
  event: CalendarEvent;
  /** Column the gesture started in. */
  columnIndex: number;
  /** Minutes from `hourRange[0] * 60` to the event's real start. May be negative. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60` to the event's real end. Never clipped. */
  endMinutes: number;
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

/** Capture the semantic frame for a gesture on `block`. */
function frameOf(block: TimedEventBlock, baseMinutes: number): DragFrame {
  const { event } = block;
  const start = event.startsAt;
  const startMinutes = start.getHours() * 60 + start.getMinutes() - baseMinutes;
  const end = event.endsAt ?? event.startsAt;
  // Wall-clock, NOT elapsed: `dateAtMinutes` projects in wall-clock minutes,
  // so an elapsed-ms duration disagrees with it by an hour either side of a
  // daylight-saving transition — proposing a resize that changes nothing, or
  // a move that silently loses an hour.
  const dayDiff = Math.round(
    (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000,
  );
  const startWall = start.getHours() * 60 + start.getMinutes();
  const endWall = end.getHours() * 60 + end.getMinutes();
  const duration = Math.max(0, dayDiff * 24 * 60 + (endWall - startWall));
  return {
    event,
    columnIndex: block.dayIndex,
    startMinutes,
    endMinutes: startMinutes + duration,
  };
}

interface ProjectionConfig {
  columns: readonly HourGridColumnRef[];
  baseMinutes: number;
  visibleMinutes: number;
  snap: number;
}

/**
 * Turn a raw target (in grid minutes) into a fully-resolved preview: snapped,
 * bounded, and projected to real instants.
 *
 * **One invariant governs both bounds: the allowed range always contains the
 * value the gesture started from.** That is what keeps a clamp honest — it can
 * refuse to move further, but it can never move the event in the direction
 * opposite to the one the user asked for. Without it, an event already sitting
 * outside the window (clipped at the top of the grid, or ending after
 * midnight) gets yanked *into* the window by a gesture that asked to push it
 * further out.
 *
 * Within that invariant:
 * - a move keeps the start inside the visible window, because an unclamped
 *   upward drag goes negative and projects back into the previous calendar
 *   day — a proposal for a date the pointer never visited. The end is free to
 *   fall outside; an overnight booking must keep its duration.
 * - a resize may grow the event by at most a day per gesture, which stops a
 *   runaway pointer delta rolling through whole dates while leaving every
 *   duration — including a multi-day one — reachable.
 */
function project(
  frame: DragFrame,
  mode: DragMode,
  columnIndex: number,
  target: number,
  cfg: ProjectionConfig,
): DragPreview {
  const column = cfg.columns[columnIndex] ?? cfg.columns[frame.columnIndex];
  const duration = frame.endMinutes - frame.startMinutes;

  if (mode === 'move') {
    const requested = snapTo(target, cfg.snap);
    const startMinutes = clamp(
      requested,
      Math.min(0, frame.startMinutes),
      Math.max(cfg.visibleMinutes - cfg.snap, frame.startMinutes),
    );
    return {
      eventId: frame.event.id,
      mode,
      columnIndex,
      startMinutes,
      endMinutes: startMinutes + duration,
      clamped: startMinutes !== requested,
      startsAt: dateAtMinutes(column.date, cfg.baseMinutes + startMinutes),
      // Projected from the same wall-clock origin, so the proposal's duration
      // matches the event's even when it crosses midnight.
      endsAt: dateAtMinutes(column.date, cfg.baseMinutes + startMinutes + duration),
      invalid: false,
    };
  }

  // Resize leaves the start alone — including when it sits above the visible
  // window (an event that began before `hourRange`).
  //
  // The ceiling bounds the CHANGE (a day's growth per gesture), not the
  // absolute duration. An absolute cap collapses onto the current end for
  // anything already that long, which — combined with the no-op check in
  // `commit` — silently swallows every attempt to lengthen a multi-day event.
  const startMinutes = frame.startMinutes;
  const requested = snapTo(target, cfg.snap);
  const endMinutes = clamp(
    requested,
    Math.min(startMinutes + cfg.snap, frame.endMinutes),
    frame.endMinutes + 24 * 60,
  );
  return {
    eventId: frame.event.id,
    mode,
    columnIndex,
    startMinutes,
    endMinutes,
    clamped: endMinutes !== requested,
    startsAt: frame.event.startsAt,
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
 * applied: `canDropEvent` vetoes it live during the gesture, and the preview
 * renders refused for as long as the pointer sits on a refused slot.
 * `onEventMove` / `onEventResize` can also veto on release, by returning
 * `false` or a promise that resolves `false` or rejects; that verdict is
 * announced in the live region rather than styled, because by then the
 * gesture is over and the preview is being discarded either way. The block's
 * resting position always comes from `events`, so an accepted drop only moves
 * anything because the consumer commits it. Nothing here mutates the event.
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

  const announce = useCallback(
    (
      event: CalendarEvent,
      p: DragPreview,
      opts: { refused?: boolean; atEdge?: boolean; unchanged?: boolean } = {},
    ) => {
      seqRef.current += 1;
      setAnnouncement({
        event,
        mode: p.mode,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        refused: opts.refused ?? false,
        atEdge: opts.atEdge ?? false,
        unchanged: opts.unchanged ?? false,
        seq: seqRef.current,
      });
    },
    [],
  );

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
    frame: DragFrame;
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
  // in an effect so the values the listeners see are always ones that actually
  // committed.
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
    (p: DragPreview, frame: DragFrame): boolean => {
      const check = latest.current.canDropEvent;
      if (!check) return true;
      const move = toPayload(p);
      // A resize can't change the column, so the candidate it offers doesn't
      // carry a `resourceId` the consumer might read and act on.
      const candidate: CalendarDropCandidate =
        p.mode === 'move'
          ? { mode: 'move', ...move }
          : { mode: 'resize', startsAt: move.startsAt, endsAt: move.endsAt };
      return check(frame.event, candidate);
    },
    [toPayload],
  );

  /**
   * End the live gesture. Always runs to completion for the gesture that owns
   * the pointer — never token-guarded, because leaving `gestureRef` populated
   * is what strands the hook: `dragging` stays true, the window listeners stay
   * subscribed, and `nudge` refuses to start because it thinks a drag is live.
   */
  const endGesture = useCallback(() => {
    gestureRef.current = null;
    setDragging(false);
  }, []);

  /**
   * Drop the preview — but only if a newer gesture has not already taken over.
   * This IS token-guarded: a settling async commit from gesture N must not
   * wipe the preview gesture N+1 is currently drawing.
   */
  const clearPreview = useCallback(
    (token: number) => {
      if (token !== tokenRef.current) return;
      setPreviewBoth(null);
    },
    [setPreviewBoth],
  );

  const finish = useCallback(
    (token: number) => {
      endGesture();
      clearPreview(token);
    },
    [endGesture, clearPreview],
  );

  const commit = useCallback(
    (p: DragPreview, frame: DragFrame, token: number) => {
      // The gesture asked for something the bounds refused, so the proposal is
      // identical to where the event already is. Say so, and do NOT call the
      // handler — the documented consumer shape is an API write, and a drag
      // that moved nothing must not fire one.
      //
      // Lives here rather than on the keyboard path so pointer drags get it
      // too: a fully-clamped drag is just as much a no-op as a clamped nudge.
      if (
        p.startMinutes === frame.startMinutes &&
        p.endMinutes === frame.endMinutes &&
        p.columnIndex === frame.columnIndex
      ) {
        // Two different things end up here. `clamped` means the bounds refused
        // to go further; otherwise the user simply released where they
        // started, and telling them they "cannot move any further" would be
        // nonsense.
        announce(frame.event, p, p.clamped ? { atEdge: true } : { unchanged: true });
        finish(token);
        return;
      }
      // A refused placement never reaches the consumer.
      if (!validate(p, frame)) {
        announce(frame.event, p, { refused: true });
        finish(token);
        return;
      }
      const payload = toPayload(p);
      const result: CalendarDropResult =
        p.mode === 'move'
          ? onEventMove?.(frame.event, payload)
          : onEventResize?.(frame.event, { startsAt: payload.startsAt, endsAt: payload.endsAt });

      if (isThenable(result)) {
        // Hold the preview until the consumer's async verdict lands, so an
        // accepted drop doesn't flash back to its old slot while the request
        // is in flight. The gesture itself is over.
        endGesture();
        result.then(
          (verdict) => {
            // Guarded on the token: a verdict that lands after the user has
            // begun another gesture must not narrate the old placement over
            // the new one.
            if (token === tokenRef.current)
              announce(frame.event, p, { refused: verdict === false });
            clearPreview(token);
          },
          () => {
            if (token === tokenRef.current) announce(frame.event, p, { refused: true });
            clearPreview(token);
          },
        );
        return;
      }
      announce(frame.event, p, { refused: result === false });
      finish(token);
    },
    [validate, toPayload, onEventMove, onEventResize, finish, endGesture, clearPreview, announce],
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
        frame: frameOf(block, latest.current.baseMinutes),
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

      let columnIndex = previewRef.current?.columnIndex ?? g.frame.columnIndex;
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
      if (columnIndex < 0 || columnIndex >= cols.length) columnIndex = g.frame.columnIndex;

      const target =
        g.mode === 'move' ? g.frame.startMinutes + rawDelta : g.frame.endMinutes + rawDelta;
      const next = project(g.frame, g.mode, columnIndex, target, cfg());
      next.invalid = !validate(next, g.frame);
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
        announce(g.frame.event, next, { refused: next.invalid });
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
      commit(p, g.frame, g.token);
    };

    const handleCancel = (e: globalThis.PointerEvent) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.pointerId) return;
      // Pointer cancellation (a system gesture taking over, the element being
      // removed) discards the drag without proposing anything.
      finish(g.token);
    };

    // Last-resort recovery. There is no pointer capture here, so a `pointerup`
    // delivered to another document — an alt-tab mid-drag, a devtools
    // detach — never reaches us, and the gesture would otherwise stay live
    // forever, taking the keyboard path down with it.
    const handleBlur = () => {
      const g = gestureRef.current;
      if (!g) return;
      // Arm the suppression the same way `handleUp` does. Without it the
      // `pointerup` that follows finds no gesture, its `click` reaches the
      // column, and the consumer's "create a booking here" UI opens at the
      // spot the user was dragging to.
      if (g.moved) suppressClickRef.current = true;
      finish(g.token);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('blur', handleBlur);
    };
  }, [dragging, commit, finish, setPreviewBoth, validate, cfg, announce]);

  const nudge = useCallback(
    (block: TimedEventBlock, delta: { mode: DragMode; steps: number; columns?: number }) => {
      if (delta.mode === 'move' && !canMove) return;
      if (delta.mode === 'resize' && !canResize) return;
      // A pointer gesture already owns the hook (pointerdown focused the
      // block, so a keypress can land mid-drag). Bumping the token here would
      // orphan that gesture: its pointerup would no-op and leave the grid
      // stuck in the dragging state.
      if (gestureRef.current) return;

      const frame = frameOf(block, latest.current.baseMinutes);
      const step = latest.current.snap;
      const columnIndex = clamp(
        frame.columnIndex + (delta.columns ?? 0),
        0,
        Math.max(0, latest.current.columns.length - 1),
      );

      // A pure column change must not also re-snap the time — moving a 09:07
      // booking to the next lane should leave it at 09:07.
      const base = delta.mode === 'move' ? frame.startMinutes : frame.endMinutes;
      const target = delta.steps === 0 ? base : snapTo(base, step) + delta.steps * step;
      const next = project(frame, delta.mode, columnIndex, target, cfg());

      tokenRef.current += 1;
      // `commit` owns the no-op check, so a clamped nudge and a clamped drag
      // report identically.
      commit(next, frame, tokenRef.current);
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
