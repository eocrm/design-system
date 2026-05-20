import { startOfDay, toDateKey } from '../../calendar/dateMath';
import type { Week } from '../../calendar/types';
import type {
  AllDayBar,
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

interface DayRef {
  date: Date;
  key: string;
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
 *   assignment; each block's `laneCount` equals the size of its transitive
 *   collision group (so siblings render at uniform width within the group).
 * - Events outside the day range are dropped; events partially outside the
 *   hour range keep their natural `startMinutes`/`endMinutes` (may be
 *   negative or past the range) so the renderer can clip visually.
 */
export function layoutEventsForHourGrid(
  events: readonly CalendarEvent[],
  days: readonly DayRef[],
  hourRange: readonly [number, number],
): HourGridLayout {
  if (events.length === 0 || days.length === 0) {
    return { timedBlocks: [], allDayBars: [] };
  }

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
    const dayIndex = days.findIndex((d) => startOfDay(d.date).getTime() === eventStartDay);
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

    // Step 2: within each group, assign a unique lane per event (greedy, no
    // recycling within the group) so that laneCount = group.members.length
    // and no two same-lane events ever share screen space.
    for (const g of groups) {
      const laneCount = g.members.length;
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
          laneCount,
        });
      }
    }
  }

  const allDayBars = layoutAllDayBars(allDayInput, days);
  return { timedBlocks, allDayBars };
}

function layoutAllDayBars(
  events: readonly CalendarEvent[],
  days: readonly DayRef[],
): readonly AllDayBar[] {
  if (events.length === 0) return [];
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
