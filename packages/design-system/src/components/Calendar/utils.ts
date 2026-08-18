import { addDays, startOfDay, toDateKey } from '../../calendar/dateMath';
import type { Week } from '../../calendar/types';
import type {
  AllDayBar,
  BackgroundBlock,
  CalendarBackgroundInterval,
  CalendarEvent,
  EventBar,
  HourGridLayout,
  MonthLayout,
  TimedEventBlock,
} from './types';

const MS_PER_DAY = 86_400_000;

interface NormalizedEvent {
  event: CalendarEvent;
  /** Local midnight of the first day. */
  start: Date;
  /** Local midnight of the last day (inclusive). */
  end: Date;
  /** Day-count duration (end - start). 0 for single-day. */
  duration: number;
}

function normalize(event: CalendarEvent): NormalizedEvent {
  let start = startOfDay(event.startsAt);
  let end = startOfDay(event.endsAt ?? event.startsAt);
  if (end.getTime() < start.getTime()) {
    [start, end] = [end, start];
  }
  const duration = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return { event, start, end, duration };
}

/**
 * Convert a flat events list into placed bars on a month grid.
 *
 * - Multi-day events are sliced at week boundaries — they appear as multiple
 *   bars with `continuesLeft` / `continuesRight` flags on the affected edges.
 * - Events entirely outside the grid are dropped; partial overlaps are clipped.
 * - Lane assignment is greedy: events sorted by `(startsAt asc, durationDesc)`;
 *   each segment lands in the lowest lane index where it doesn't overlap an
 *   already-placed segment in the same week.
 * - Bars in lanes >= `maxLanes` are dropped from `bars` and contribute to
 *   `hiddenCounts` for every day they cover.
 */
export function layoutEventsForMonth(
  events: readonly CalendarEvent[],
  weeks: readonly Week[],
  maxLanes: number,
): MonthLayout {
  if (events.length === 0 || weeks.length === 0) {
    return { bars: [], hiddenCounts: new Map() };
  }

  const gridStart = weeks[0][0].date;
  const gridEnd = weeks[weeks.length - 1][6].date;

  const normalized = events
    .map(normalize)
    .filter((n) => n.end.getTime() >= gridStart.getTime() && n.start.getTime() <= gridEnd.getTime())
    .sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff !== 0) return startDiff;
      return b.duration - a.duration;
    });

  const bars: EventBar[] = [];
  const hiddenCounts = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    const weekStart = week[0].date;
    const weekEnd = week[6].date;

    interface Segment {
      ne: NormalizedEvent;
      startCol: number;
      endCol: number;
    }
    const segments: Segment[] = [];

    for (const ne of normalized) {
      if (ne.end.getTime() < weekStart.getTime() || ne.start.getTime() > weekEnd.getTime())
        continue;
      const segStartMs = Math.max(ne.start.getTime(), weekStart.getTime());
      const segEndMs = Math.min(ne.end.getTime(), weekEnd.getTime());
      const startCol = Math.round((segStartMs - weekStart.getTime()) / MS_PER_DAY) + 1;
      const endCol = Math.round((segEndMs - weekStart.getTime()) / MS_PER_DAY) + 1;
      segments.push({ ne, startCol, endCol });
    }

    interface LaneSegment {
      startCol: number;
      endCol: number;
    }
    const lanes: LaneSegment[][] = [];

    for (const seg of segments) {
      let assigned = -1;
      for (let l = 0; l < lanes.length; l++) {
        const conflicts = lanes[l].some(
          (s) => !(s.endCol < seg.startCol || s.startCol > seg.endCol),
        );
        if (!conflicts) {
          assigned = l;
          break;
        }
      }
      if (assigned === -1) {
        assigned = lanes.length;
        lanes.push([]);
      }
      lanes[assigned].push({ startCol: seg.startCol, endCol: seg.endCol });

      const bar: EventBar = {
        event: seg.ne.event,
        weekIndex,
        startCol: seg.startCol,
        endCol: seg.endCol,
        lane: assigned,
        continuesLeft: seg.ne.start.getTime() < weekStart.getTime(),
        continuesRight: seg.ne.end.getTime() > weekEnd.getTime(),
      };

      if (assigned < maxLanes) {
        bars.push(bar);
      } else {
        for (let col = seg.startCol; col <= seg.endCol; col++) {
          const date = week[col - 1].date;
          const key = toDateKey(date);
          hiddenCounts.set(key, (hiddenCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return { bars, hiddenCounts };
}

/**
 * One column of an hour grid. A week view supplies seven, one per weekday; a
 * plain day view supplies one; a resource day view supplies one per resource
 * (all carrying the same `date`) plus, when needed, a trailing unassigned
 * column.
 */
export interface HourGridColumnRef {
  /** The date this column covers. Identical across every column of a resource day view. */
  date: Date;
  /** Stable React key. */
  key: string;
  /**
   * Resource identity of this column:
   * - `undefined` — the grid is not split by resource (week view, plain day view).
   * - a string — this column belongs to that `CalendarResource`.
   * - `null` — the trailing "unassigned" column.
   */
  resourceId?: string | null;
}

/** True when the supplied columns represent resource lanes rather than dates. */
function isResourceGrid(columns: readonly HourGridColumnRef[]): boolean {
  return columns.some((c) => c.resourceId !== undefined);
}

/**
 * Which column does this event belong in?
 *
 * Date grids match on the event's start day. Resource grids match the event's
 * `resourceId` against the column's; anything that doesn't match — including
 * an event with no `resourceId` at all — falls back to the unassigned column
 * when one is rendered, and is dropped when one is not.
 */
function findColumnIndex(
  columns: readonly HourGridColumnRef[],
  eventStartDayMs: number,
  resourceId: string | undefined,
  resourceMode: boolean,
): number {
  const onDay = (c: HourGridColumnRef) => startOfDay(c.date).getTime() === eventStartDayMs;
  if (!resourceMode) return columns.findIndex(onDay);
  const wanted = resourceId ?? null;
  const exact = columns.findIndex((c) => onDay(c) && c.resourceId === wanted);
  if (exact !== -1) return exact;
  return columns.findIndex((c) => onDay(c) && c.resourceId === null);
}

interface NormalizedTimed {
  event: CalendarEvent;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Lay out events for a Week or Day view's hour grid.
 *
 * - `allDay` events become bars in the AllDayBand (multi-day spans flatten
 *   edges, like the month bars).
 * - Timed events get positioned in their day column with greedy lane
 *   assignment (lanes recycle once an earlier event ends). The cascade
 *   renderer in TimedEvent.tsx uses `lane` for both left-offset and z-index
 *   stacking; every block extends to the column's right edge.
 * - Events outside the day range are dropped; events partially outside the
 *   hour range keep their natural `startMinutes`/`endMinutes` (may be
 *   negative or past the range) so the renderer can clip visually.
 */
export function layoutEventsForHourGrid(
  events: readonly CalendarEvent[],
  days: readonly HourGridColumnRef[],
  hourRange: readonly [number, number],
): HourGridLayout {
  if (events.length === 0 || days.length === 0) {
    return { timedBlocks: [], allDayBars: [] };
  }

  const resourceMode = isResourceGrid(days);
  const viewStart = startOfDay(days[0].date).getTime();
  const viewEnd = startOfDay(days[days.length - 1].date).getTime() + MS_PER_DAY;
  const baseHourMinutes = hourRange[0] * 60;

  const timedNormalized: NormalizedTimed[] = [];
  const allDayInput: CalendarEvent[] = [];

  for (const ev of events) {
    const start = ev.startsAt;
    const end = ev.endsAt ?? ev.startsAt;
    if (end.getTime() < viewStart || start.getTime() >= viewEnd) continue;
    if (ev.allDay === true) {
      allDayInput.push(ev);
      continue;
    }
    const eventStartDay = startOfDay(start).getTime();
    const dayIndex = findColumnIndex(days, eventStartDay, ev.resourceId, resourceMode);
    if (dayIndex === -1) continue;
    const startMinutes = start.getHours() * 60 + start.getMinutes() - baseHourMinutes;
    // If the event ends on a later day, clamp to end-of-day so the block extends
    // to the bottom of the visible column rather than collapsing to negative height.
    const endsOnSameDay = startOfDay(end).getTime() === eventStartDay;
    const rawEndMinutes = end.getHours() * 60 + end.getMinutes() - baseHourMinutes;
    const endMinutes = endsOnSameDay ? rawEndMinutes : 24 * 60 - baseHourMinutes;
    timedNormalized.push({ event: ev, dayIndex, startMinutes, endMinutes });
  }

  const timedBlocks: TimedEventBlock[] = [];
  for (let d = 0; d < days.length; d++) {
    const dayEvents = timedNormalized
      .filter((n) => n.dayIndex === d)
      .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

    // Step 1: sweep sorted events into transitive collision groups.
    interface Group {
      members: NormalizedTimed[];
    }
    const groups: Group[] = [];
    let currentGroup: Group | null = null;
    let currentEndMax = -Infinity;
    for (const ne of dayEvents) {
      if (ne.startMinutes >= currentEndMax) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { members: [ne] };
        currentEndMax = ne.endMinutes;
      } else {
        currentGroup!.members.push(ne);
        currentEndMax = Math.max(currentEndMax, ne.endMinutes);
      }
    }
    if (currentGroup) groups.push(currentGroup);

    // Step 2: within each group, assign a leftmost-available lane to each
    // event greedily — lanes are recycled once an earlier event ends.
    for (const g of groups) {
      interface LaneState {
        endMinutes: number;
      }
      const laneBuckets: LaneState[] = [];
      for (const ne of g.members) {
        let assigned = -1;
        for (let l = 0; l < laneBuckets.length; l++) {
          if (laneBuckets[l].endMinutes <= ne.startMinutes) {
            assigned = l;
            laneBuckets[l].endMinutes = ne.endMinutes;
            break;
          }
        }
        if (assigned === -1) {
          assigned = laneBuckets.length;
          laneBuckets.push({ endMinutes: ne.endMinutes });
        }
        timedBlocks.push({
          event: ne.event,
          dayIndex: ne.dayIndex,
          startMinutes: ne.startMinutes,
          endMinutes: ne.endMinutes,
          lane: assigned,
        });
      }
    }
  }

  const allDayBars = layoutAllDayBars(allDayInput, days, resourceMode);
  return { timedBlocks, allDayBars };
}

function layoutAllDayBars(
  events: readonly CalendarEvent[],
  days: readonly HourGridColumnRef[],
  resourceMode = false,
): readonly AllDayBar[] {
  if (events.length === 0) return [];
  if (resourceMode) return layoutAllDayBarsByResource(events, days);
  const viewStartMs = startOfDay(days[0].date).getTime();
  const viewEndMs = startOfDay(days[days.length - 1].date).getTime();

  interface NormalizedAllDay {
    event: CalendarEvent;
    startMs: number;
    endMs: number;
    duration: number;
  }
  const normalized: NormalizedAllDay[] = [];
  for (const ev of events) {
    let startMs = startOfDay(ev.startsAt).getTime();
    let endMs = startOfDay(ev.endsAt ?? ev.startsAt).getTime();
    if (endMs < startMs) [startMs, endMs] = [endMs, startMs];
    if (endMs < viewStartMs || startMs > viewEndMs) continue;
    normalized.push({ event: ev, startMs, endMs, duration: (endMs - startMs) / MS_PER_DAY });
  }
  normalized.sort((a, b) => a.startMs - b.startMs || b.duration - a.duration);

  interface LaneSegment {
    startCol: number;
    endCol: number;
  }
  const lanes: LaneSegment[][] = [];
  const bars: AllDayBar[] = [];

  for (const n of normalized) {
    const segStartMs = Math.max(n.startMs, viewStartMs);
    const segEndMs = Math.min(n.endMs, viewEndMs);
    const startCol = Math.round((segStartMs - viewStartMs) / MS_PER_DAY);
    const endCol = Math.round((segEndMs - viewStartMs) / MS_PER_DAY);

    let assigned = -1;
    for (let l = 0; l < lanes.length; l++) {
      const conflicts = lanes[l].some((s) => !(s.endCol < startCol || s.startCol > endCol));
      if (!conflicts) {
        assigned = l;
        break;
      }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push([]);
    }
    lanes[assigned].push({ startCol, endCol });

    bars.push({
      event: n.event,
      startCol,
      endCol,
      lane: assigned,
      continuesLeft: n.startMs < viewStartMs,
      continuesRight: n.endMs > viewEndMs,
    });
  }
  return bars;
}

/**
 * All-day placement for a resource day view, where every column carries the
 * same date and columns differ by resource instead.
 *
 * - No `resourceId` → the event is day-wide (a public holiday, a closure) and
 *   spans every column as one bar.
 * - `resourceId` matching a column → that column only.
 * - `resourceId` matching nothing → the unassigned column when one is
 *   rendered; dropped otherwise.
 */
function layoutAllDayBarsByResource(
  events: readonly CalendarEvent[],
  columns: readonly HourGridColumnRef[],
): readonly AllDayBar[] {
  const dayStartMs = startOfDay(columns[0].date).getTime();
  const unassignedCol = columns.findIndex((c) => c.resourceId === null);

  interface Placed {
    event: CalendarEvent;
    startCol: number;
    endCol: number;
    continuesLeft: boolean;
    continuesRight: boolean;
    span: number;
  }
  const placed: Placed[] = [];

  for (const ev of events) {
    let startMs = startOfDay(ev.startsAt).getTime();
    let endMs = startOfDay(ev.endsAt ?? ev.startsAt).getTime();
    if (endMs < startMs) [startMs, endMs] = [endMs, startMs];
    if (endMs < dayStartMs || startMs > dayStartMs) continue;

    let startCol: number;
    let endCol: number;
    if (ev.resourceId === undefined) {
      startCol = 0;
      endCol = columns.length - 1;
    } else {
      const exact = columns.findIndex((c) => c.resourceId === ev.resourceId);
      const col = exact !== -1 ? exact : unassignedCol;
      if (col === -1) continue;
      startCol = col;
      endCol = col;
    }
    placed.push({
      event: ev,
      startCol,
      endCol,
      // The band spans a single date here, so "continues" means the event
      // extends beyond that date in either direction.
      continuesLeft: startMs < dayStartMs,
      continuesRight: endMs > dayStartMs,
      span: endCol - startCol,
    });
  }

  // Widest first so a day-wide bar takes lane 0 and per-resource bars stack
  // below it, matching how the month/week bands read.
  placed.sort((a, b) => b.span - a.span || a.startCol - b.startCol);

  interface LaneSegment {
    startCol: number;
    endCol: number;
  }
  const lanes: LaneSegment[][] = [];
  const bars: AllDayBar[] = [];

  for (const p of placed) {
    let assigned = -1;
    for (let l = 0; l < lanes.length; l++) {
      const conflicts = lanes[l].some(
        (seg) => !(seg.endCol < p.startCol || seg.startCol > p.endCol),
      );
      if (!conflicts) {
        assigned = l;
        break;
      }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push([]);
    }
    lanes[assigned].push({ startCol: p.startCol, endCol: p.endCol });
    bars.push({
      event: p.event,
      startCol: p.startCol,
      endCol: p.endCol,
      lane: assigned,
      continuesLeft: p.continuesLeft,
      continuesRight: p.continuesRight,
    });
  }
  return bars;
}

/**
 * Does this day need a trailing "unassigned" column?
 *
 * True when at least one event on `date` cannot be placed in a resource
 * column: it carries a `resourceId` that matches no supplied resource, or it
 * is a timed event with no `resourceId` at all. All-day events with no
 * `resourceId` do NOT count — those are day-wide and span every column, so
 * they need no lane of their own.
 *
 * The column is conditional on purpose: an always-present empty lane is
 * noise in the common case where every booking has a resource.
 */
export function needsUnassignedColumn(
  events: readonly CalendarEvent[],
  date: Date,
  resourceIds: ReadonlySet<string>,
): boolean {
  const dayStartMs = startOfDay(date).getTime();
  const dayEndMs = startOfDay(addDays(date, 1)).getTime();
  for (const ev of events) {
    const start = ev.startsAt.getTime();
    const end = (ev.endsAt ?? ev.startsAt).getTime();
    // All-day events are compared by whole days; timed events by instant.
    const overlaps =
      ev.allDay === true
        ? startOfDay(ev.endsAt ?? ev.startsAt).getTime() >= dayStartMs &&
          startOfDay(ev.startsAt).getTime() <= dayStartMs
        : end >= dayStartMs && start < dayEndMs;
    if (!overlaps) continue;
    if (ev.resourceId !== undefined) {
      if (!resourceIds.has(ev.resourceId)) return true;
    } else if (ev.allDay !== true) {
      return true;
    }
  }
  return false;
}

/**
 * Clip an availability underlay onto the hour grid.
 *
 * Each interval is intersected with every column's own day and with the
 * visible `hourRange`, so a shift that runs past midnight or starts before
 * the first rendered hour is trimmed rather than dropped. An interval
 * carrying a `resourceId` only paints its own column, and only when the grid
 * actually has resource columns — in a week view (or a resource-less day
 * view) `resourceId` is ignored and every interval paints every column.
 *
 * Intervals are laid out independently of the events and of each other: they
 * take no part in the collision cascade, and overlapping intervals simply
 * paint over one another in array order.
 */
export function layoutBackgroundIntervals(
  intervals: readonly CalendarBackgroundInterval[],
  columns: readonly HourGridColumnRef[],
  hourRange: readonly [number, number],
): readonly BackgroundBlock[] {
  if (intervals.length === 0 || columns.length === 0) return [];

  const resourceMode = isResourceGrid(columns);
  const baseMinutes = hourRange[0] * 60;
  const visibleMinutes = (hourRange[1] - hourRange[0]) * 60;
  if (visibleMinutes <= 0) return [];

  const blocks: BackgroundBlock[] = [];

  for (let c = 0; c < columns.length; c++) {
    const column = columns[c];
    const dayStart = startOfDay(column.date);
    const dayStartMs = dayStart.getTime();
    // Next local midnight, not `+ 86_400_000` — a DST day is 23 or 25 hours.
    const dayEndMs = startOfDay(addDays(dayStart, 1)).getTime();

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      if (
        resourceMode &&
        interval.resourceId !== undefined &&
        column.resourceId !== interval.resourceId
      ) {
        continue;
      }
      const rawStart = interval.startsAt.getTime();
      const rawEnd = interval.endsAt.getTime();
      if (!(rawEnd > rawStart)) continue;

      const clippedStartMs = Math.max(rawStart, dayStartMs);
      const clippedEndMs = Math.min(rawEnd, dayEndMs);
      if (clippedEndMs <= clippedStartMs) continue;

      // Wall-clock minutes (matching how timed events are placed), with the
      // day's own end pinned to 24:00 rather than read back as 00:00.
      const startOfDayMinutes = minutesIntoDay(clippedStartMs, dayEndMs);
      const endOfDayMinutes = minutesIntoDay(clippedEndMs, dayEndMs);

      const startMinutes = Math.max(0, startOfDayMinutes - baseMinutes);
      const endMinutes = Math.min(visibleMinutes, endOfDayMinutes - baseMinutes);
      if (endMinutes <= startMinutes) continue;

      blocks.push({
        key: `bg-${i}-${c}`,
        dayIndex: c,
        startMinutes,
        endMinutes,
        tone: interval.tone ?? 'unavailable',
      });
    }
  }

  return blocks;
}

/** Wall-clock minutes since local midnight, with the next midnight read as 24:00. */
function minutesIntoDay(ms: number, dayEndMs: number): number {
  if (ms === dayEndMs) return 24 * 60;
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Human-readable event duration: "0m" / "30m" / "1h" / "1h 30m" / "2d" /
 * "2d 5h". For tooltip / display contexts where a compact label is wanted.
 *
 * When `allDay` is true, the count is inclusive of both the start and end
 * day — so an event from `May 11` to `May 27` reads as `17d`, matching the
 * visual span of the bar across the calendar grid (the user sees 17 days
 * highlighted). Otherwise (timed events), it's a raw `end - start` diff:
 * `9:00 → 9:30` reads as `30m`.
 */
export function formatEventDuration(
  startsAt: Date,
  endsAt: Date | undefined,
  allDay = false,
): string {
  if (allDay) {
    const startDayMs = startOfDay(startsAt).getTime();
    const endDayMs = startOfDay(endsAt ?? startsAt).getTime();
    const dayDiff = Math.round((endDayMs - startDayMs) / 86_400_000);
    const days = Math.max(1, dayDiff + 1);
    return `${days}d`;
  }
  const start = startsAt.getTime();
  const end = (endsAt ?? startsAt).getTime();
  const minutes = Math.max(0, Math.round((end - start) / 60_000));
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin === 0 ? `${hours}h` : `${hours}h ${remMin}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}
